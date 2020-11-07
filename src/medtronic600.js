import HID from "./hid";

const debug = true ? console.log : () => null;

const VID = 0x1a79;
const PID = 0x6210;

// const buildMinimedMessage = () => {
//   const header = 0x51;
//   const deviceType = 0x03; // Next Generation Pump (NGP). AKA 600-series.
//   const ascii0 = 0x30; // '0'
//   const pumpSerialNumber = [ascii0, ascii0, ascii0, ascii0, ascii0, ascii0]; // ASCII numbers, always '000000' for 600-series
//   const operation = 0x01; // OPEN_CONNECTION
// };

const openConnectionRequest = async () => {};

const medtronic600 = async () => {
  const success = await HID.open(VID, PID);
  if (success) {
    debug(await openConnectionRequest());
    try {
    } finally {
      await HID.close();
    }
  }
};
export default medtronic600;
