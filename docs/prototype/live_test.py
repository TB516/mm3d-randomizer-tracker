"""Read-only live test: reads MM3D Randomizer state from Azahar over its RPC server.

Usage: python3 -I live_test.py <path to code.ips>
Only ever sends ProcessList, SetGetProcess and ReadMemory requests.
"""
import random
import socket
import struct
import sys
import time

RPC_ADDRESS = ("127.0.0.1", 45987)
RPC_VERSION = 2
READ_MEMORY, PROCESS_LIST, SET_GET_PROCESS = 1, 3, 4
MAX_READ = 32 * 1024

MM3D_TITLE_ID = 0x0004000000125500
SAVE_DATA_ADDRESS = 0x7751D8 + 8  # CommonData.save
SAVE_DATA_SIZE = 0x1A88
RANDO_SCAN_START, RANDO_SCAN_END = 0x7D0000, 0xA00000  # randomizer .text through .bss
EXT_SAVE_VERSION = 19
EXT_SAVE_SIZE = 4296
ITEM_COLLECTED = slice(44, 556)
CHEST_REWARDED = slice(556, 556 + 116 * 32)

rpc_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
rpc_socket.settimeout(1.0)


def request(packet_type, payload):
    request_id = random.getrandbits(32)
    header = struct.pack("<IIII", RPC_VERSION, request_id, packet_type, len(payload))
    for _ in range(3):
        rpc_socket.sendto(header + payload, RPC_ADDRESS)
        try:
            while True:
                reply = rpc_socket.recv(16 + MAX_READ)
                version, reply_id, reply_type, size = struct.unpack("<IIII", reply[:16])
                if reply_id == request_id and reply_type == packet_type and size == len(reply) - 16:
                    return reply[16:]
        except socket.timeout:
            continue
    raise TimeoutError("No reply from Azahar's RPC server. Is it enabled?")


def read_memory(address, size):
    data = bytearray()
    while size > 0:
        chunk = request(READ_MEMORY, struct.pack("<II", address, min(size, MAX_READ)))
        if not chunk:
            return None
        data += chunk
        address += len(chunk)
        size -= len(chunk)
    return bytes(data)


def select_mm3d_process():
    reply = request(PROCESS_LIST, struct.pack("<II", 0, 0x7FFFFFFF))
    count = struct.unpack("<I", reply[:4])[0]
    for i in range(count):
        process_id, title_id, _ = struct.unpack("<IQ8s", reply[4 + i * 0x14: 4 + (i + 1) * 0x14])
        if title_id == MM3D_TITLE_ID:
            request(SET_GET_PROCESS, struct.pack("<II", 1, process_id))
            return process_id
    return None


def looks_like_ext_save(block):
    return (
        len(block) == EXT_SAVE_SIZE
        and struct.unpack("<I", block[:4])[0] == EXT_SAVE_VERSION
        and block[8:12] in (b"\0\0\0\0", b"\1\0\0\0")
        and all(value <= 1 for value in block[ITEM_COLLECTED])
        and all(value <= 1 for value in block[CHEST_REWARDED])
        and any(block[ITEM_COLLECTED])
    )


def find_ext_save():
    region = read_memory(RANDO_SCAN_START, RANDO_SCAN_END - RANDO_SCAN_START) or b""
    needle = struct.pack("<I", EXT_SAVE_VERSION)
    offset = region.find(needle)
    while offset != -1:
        if offset % 4 == 0 and looks_like_ext_save(region[offset:offset + EXT_SAVE_SIZE]):
            return RANDO_SCAN_START + offset
        offset = region.find(needle, offset + 1)
    return None


def load_location_names(ips_path):
    patch = open(ips_path, "rb").read()
    image = bytearray(0x900000)
    position = 5
    while patch[position:position + 3] != b"EOF":
        offset = int.from_bytes(patch[position:position + 3], "big")
        size = int.from_bytes(patch[position + 3:position + 5], "big")
        position += 5
        if size == 0:
            length = int.from_bytes(patch[position:position + 2], "big")
            image[offset:offset + length] = patch[position + 2:position + 3] * length
            position += 3
        else:
            image[offset:offset + size] = patch[position:position + size]
            position += size
    strings = image.index(b"Song of Time\0Deku Mask\0")
    base = strings - 1024 - 512 * 12 - 204
    count = int.from_bytes(image[base + 2:base + 4], "little")
    names = []
    for index in range(count):
        string_offset = int.from_bytes(image[base + 204 + index * 12: base + 206 + index * 12], "little")
        end = image.index(b"\0", strings + string_offset)
        names.append(image[strings + string_offset:end].decode())
    return names


def describe_save(save):
    skulltulas = struct.unpack("<I", save[0x1208:0x120C])[0]
    max_health = struct.unpack("<H", save[0x118 + 0x1A:0x118 + 0x1C])[0]
    rupees = struct.unpack("<H", save[0x118 + 0x20:0x118 + 0x22])[0]
    return f"hearts {max_health // 16}, rupees {rupees}, swamp tokens {skulltulas >> 16}, ocean tokens {skulltulas & 0xFFFF}"


def main():
    names = load_location_names(sys.argv[1])
    process_id = select_mm3d_process()
    if process_id is None:
        sys.exit("Majora's Mask isn't running in Azahar.")
    print(f"Connected, MM3D process {process_id}")

    ext_save_address = None
    while ext_save_address is None:
        ext_save_address = find_ext_save()
        if ext_save_address is None:
            print("Randomizer data not found yet (load your file). Retrying in 3s...")
            time.sleep(3)
    print(f"Randomizer data at {ext_save_address:#x}")

    previous = None
    while True:
        save = read_memory(SAVE_DATA_ADDRESS, SAVE_DATA_SIZE)
        collected = read_memory(ext_save_address, EXT_SAVE_SIZE)[ITEM_COLLECTED]
        if previous is None:
            print(describe_save(save))
            print(f"{sum(collected)} checks collected")
        else:
            for index, (was, now) in enumerate(zip(previous, collected)):
                if now and not was and index < len(names):
                    print(f"{time.strftime('%H:%M:%S')}  collected: {names[index]}  ({describe_save(save)})")
        previous = collected
        time.sleep(0.5)


if __name__ == "__main__":
    main()
