import { HID } from "../../protocol";
import { buildHidPacket, toString } from "./utils";
const debug = false ? console.log : () => null;

const VID = 0x1a61;
const PID = 0x3650;
const TIMEOUT = 1000;
const CRLF = "\r\n";

const hid = new HID(VID, PID, TIMEOUT);

const COMMAND = {
  INIT_REQUEST_1: 0x04,
  INIT_REQUEST_2: 0x05,
  INIT_REQUEST_3: 0x15,
  INIT_REQUEST_4: 0x01,
  BINARY_REQUEST: 0x0a,
  BINARY_RESPONSE: 0x0b,
  ACK_FROM_DEVICE: 0x0c,
  ACK_FROM_HOST: 0x0d,
  TEXT_REQUEST: 0x21,
  TEXT_RESPONSE: 0x60,
};

const send = (cmd, data) => {
  debug(`Command : type=0x${cmd.toString(16)} , cmd=${data}`);
  return hid.request(buildHidPacket(cmd, data));
};

const initialization = async () => {
  debug("Initialization...");
  await send(COMMAND.INIT_REQUEST_1);
  // await send(COMMAND.INIT_REQUEST_2);
  // await send(COMMAND.INIT_REQUEST_3);
  await send(COMMAND.INIT_REQUEST_4);
  debug("Initialization done");
};

const getBrandName = async () => {
  const str = toString(await send(COMMAND.TEXT_REQUEST, "$brandname?"));
  const brandName = str.substring(2, str.search(CRLF));
  debug("Brand name : ", brandName);
  return brandName;
};

const getSerialNumber = async () => {
  const str = toString(await send(COMMAND.TEXT_REQUEST, "$sn?"));
  const serialNumber = str.substring(2, 15);
  debug("Serial Number :", serialNumber);
  return serialNumber;
};

const getSoftwareVersion = async () => {
  const str = toString(await send(COMMAND.TEXT_REQUEST, "$swver?"));
  const softwareVersion = str.substring(2, str.search(CRLF));
  debug("Software version :", softwareVersion);
  return softwareVersion;
};

const getRecordsCount = async () => {
  const str = toString(await send(COMMAND.TEXT_REQUEST, "$dbrnum?"));
  const index = str.search("=") + 1;
  const recordsCount = parseInt(str.substring(index));
  debug("Records count :", recordsCount);
  return recordsCount;
};

const parseAutoMeasurements = (str) => {
  const obj = {};
  const data = str.substring(2).split(",");
  obj.sequence = data[0];
  obj.type = "interstitial";
  const date = new Date();
  date.setMonth(data[2]);
  date.setDate(data[3]);
  date.setUTCFullYear("20" + data[4]);
  date.setUTCHours(parseInt(data[5]));
  date.setMinutes(data[6]);
  date.setSeconds(data[7]);
  date.setMilliseconds(0);
  obj.date = date;

  obj.value = parseInt(data[13]);
  obj.sensorRuntime = parseInt(data[14]);
  obj.error = parseInt(data[15]);

  return obj;
};

const getAutoMeasurements = async () => {
  debug(`Command : type=0x${COMMAND.TEXT_REQUEST} , cmd=$history?`);
  const measurements = await hid.requestMultiple(
    buildHidPacket(COMMAND.TEXT_REQUEST, "$history?")
  );
  const filteredData = [];
  measurements.forEach((measure) => {
    const str = toString(measure);
    const parsedData = parseAutoMeasurements(str);
    if (parsedData.error === 0 && parsedData.sequence.search(`\x05`) === -1)
      filteredData.push(parsedData);
  });
  return filteredData;
};

const readingType = (value) => {
  switch (parseInt(value)) {
    case 0:
      return "blood-glucose";
    case 1:
      return "blood-ketone";
    case 2:
      return "sensor-glucose";
    default:
      return "";
  }
};

const parseManualMeasurements = (str) => {
  // Cleaning the frame
  const measure = str
    .substring(0, str.search(CRLF))
    .replace("`", "")
    .split(",");

  const obj = {};
  obj.sequence = measure[0];
  obj.recordType = parseInt(measure[1]);
  if (obj.recordType !== 2) return null;
  obj.type = "capillary blood glucose";
  const date = new Date();
  date.setMonth(measure[2]);
  date.setDate(measure[3]);
  date.setUTCFullYear("20" + measure[4]);
  date.setUTCHours(parseInt(measure[5]));
  date.setMinutes(measure[6]);
  date.setSeconds(measure[7]);
  date.setMilliseconds(0);
  obj.date = date;

  obj.readingType = readingType(measure[9]);
  obj.value = parseInt(measure[12]);
  obj.sportFlag = measure[15];
  obj.medicationFlag = measure[16];
  obj.rapidActingInsulinFlag = measure[17];
  obj.longActingInsulinFlag = measure[18];
  obj.foodFlag = measure[25];
  obj.foodCarbsGrams = measure[26];
  obj.error = parseInt(measure[28]);
  obj.comment1 = measure[29];
  obj.comment2 = measure[30];
  obj.comment3 = measure[31];
  obj.comment4 = measure[32];
  obj.comment5 = measure[33];
  obj.comment6 = measure[34];
  obj.rapidActingInsuline = measure[43];

  return obj;
};

const getManualMeasurements = async () => {
  debug(`Command : type=0x${COMMAND.TEXT_REQUEST} , cmd=$arresult?`);
  const frames = await hid.requestMultiple(
    buildHidPacket(COMMAND.TEXT_REQUEST, "$arresult?")
  );
  const concatenedFrames = frames.reduce((acc, curr) => {
    return acc + toString(curr);
  }, "");
  const measurements = concatenedFrames.substring(1).split(">");
  const data = [];
  for (const measureString of measurements) {
    const obj = parseManualMeasurements(measureString);
    if (obj) {
      data.push(obj);
    }
  }
  return data;
};

// const resetDevice = () => {
//   send(COMMAND.TEXT_REQUEST, "$swreset?");
//   debug("Device reseted");
// };

export const abbottFreeStyleLibre = async () => {
  if (hid.device !== null) {
    return "Device already open";
  }
  const success = await hid.open();
  if (success) {
    try {
      const obj = {};
      await initialization();
      obj.name = await getBrandName();
      obj.serial = await getSerialNumber();
      obj.softwareVersion = await getSoftwareVersion();
      obj.records = await getRecordsCount();
      obj.autoMeasurements = await getAutoMeasurements();
      obj.manualMeasurements = await getManualMeasurements();
      return obj;
    } finally {
      hid.close();
    }
  }
};
