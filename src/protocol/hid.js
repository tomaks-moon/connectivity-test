import { fromEvent, race, timer } from "rxjs";
import { map, bufferTime, takeWhile, tap, finalize } from "rxjs/operators";

const debug = false ? console.log : () => null;

export class HID {
  constructor(vendorId, productId, ms = 500) {
    this.vendorId = vendorId;
    this.productId = productId;
    this.ms = ms;
  }
  device = null;

  open = async () => {
    if (!("hid" in navigator)) {
      return false; // message: "Web HID is not supported in your navigator",
    }
    const devices = await navigator.hid.getDevices();

    //Check if device has already been granted
    for (const device of devices) {
      const { productId, vendorId } = device;
      if (vendorId === this.vendorId && productId === this.productId) {
        const message =
          `${device.productName} opened ` +
          `(VID : 0x${vendorId.toString(16)}, ` +
          `PID : 0x${productId.toString(16)})`;
        debug(message);
        this.device = device;
        await this.device.open();
        return true;
      }
    }

    //If not granted yet
    return navigator.hid
      .requestDevice({
        filters: [{ vendorId: this.vendorId, productId: this.productId }],
      })
      .then(async (devices) => {
        if (devices.length === 0) {
          return false;
        }
        const [device] = devices;
        this.device = device;
        await this.device.open();
        return true;
      });
  };

  close = () => {
    this.device.close();
    this.device = null;
  };

  write = (bytes) => {
    debug(`Send : ${Array.from(bytes)}`);
    this.device.sendReport(0, new Uint8Array(bytes));
  };

  request = (bytes) => {
    return new Promise((resolve) => {
      this.write(bytes);
      race(
        fromEvent(this.device, "inputreport"),
        timer(this.ms)
      ).subscribe((event) =>
        resolve(event?.data ? new Uint8Array(event.data.buffer) : "")
      );
    });
  };

  requestMultiple = (bytes) => {
    const buffer = [];
    return new Promise((resolve) => {
      this.write(bytes);
      fromEvent(this.device, "inputreport")
        .pipe(
          map((event) => new Uint8Array(event.data.buffer)),
          bufferTime(this.ms),
          takeWhile((b) => b.length > 0),
          tap((b) => buffer.push(...b)),
          finalize(() => resolve(buffer))
        )
        .subscribe();
    });
  };
}
