import { Client } from './Client';
import { EventEmitter } from 'events';

/**
 * Movement detector (FID_MOVEMENT_DETECTOR = 0x011 / "0011")
 *
 * Sensor-only device; maps to Homey `alarm_motion` capability.
 *   odp0000 – alarm_motion state ("1"=motion detected, "0"=idle)
 */
export class MovementDetector extends EventEmitter {
  protected readonly alarmDatapoint: string = 'odp0000';

  protected readonly onValue: string = '1';
  protected readonly offValue: string = '0';

  static MOTION_DETECTED = 'motion_detected';
  static MOTION_CLEARED = 'motion_cleared';

  constructor(
    public client: Client,
    public id: string,
    public channel: string,
    public name: string,
    public deviceType: string,
    public datapoints: { [key: string]: any },
  ) {
    super();
  }

  /** Returns true when motion is currently detected */
  getMotion(): boolean {
    return this.datapoints[this.alarmDatapoint] === this.onValue;
  }

  handleUpdate(datapoint: string, value: any): void {
    if (datapoint === this.alarmDatapoint) {
      if (value === this.onValue) {
        if (value != this.datapoints[datapoint]) {
          this.datapoints[datapoint] = value;
          this.emit(MovementDetector.MOTION_DETECTED);
        }
      } else if (value === this.offValue) {
        if (value != this.datapoints[datapoint]) {
          this.datapoints[datapoint] = value;
          this.emit(MovementDetector.MOTION_CLEARED);
        }
      }
    }
  }
}
