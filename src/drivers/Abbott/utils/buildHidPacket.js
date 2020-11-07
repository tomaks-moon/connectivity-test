const HID_PACKET_SIZE = 64;

/*
HID frame is 64 bytes lenght.
- First byte is the command
- Second byte is the total data length
- From the third byte each field are replaced by hex value of the ascii
*/

export const buildHidPacket = (cmd, data) => {
  const buffer = new Array(HID_PACKET_SIZE).fill(0);
  buffer.splice(0, 1, cmd);
  if (data) {
    buffer.splice(1, 1, data.length);
    data
      .split("")
      .map((item, index) => buffer.splice(index + 2, 1, item.charCodeAt(0)));
  }
  return buffer;
};
