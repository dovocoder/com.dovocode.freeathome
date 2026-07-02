import { Client } from './Client';
import { EventEmitter } from 'events';
export class SceneSensor extends EventEmitter {
    protected readonly sensorDatapoint: string = 'odp0000';


    protected readonly onValue: string = '1';
    protected readonly offValue: string = '0';

    static TURNED_ON = 'turned_on';
    static TURNED_OFF = 'turned_off';

    constructor (public client: Client, public id: string, public channel: string, public name: string, public deviceType: string, public datapoints: { [key: string]: any }) {
        super();
    }

    isOn () {
        return this.datapoints[this.sensorDatapoint] === this.onValue;
    }
    handleUpdate (datapoint: string, value: any) {
        if (datapoint === this.sensorDatapoint) {
            if (value == this.onValue) {
                if (value != this.datapoints[datapoint]) {
                    this.datapoints[datapoint] = value;
                    this.emit(SceneSensor.TURNED_ON);
                }
            } else if (value === this.offValue) {
                if (value != this.datapoints[datapoint]) {
                    this.datapoints[datapoint] = value;
                    this.emit(SceneSensor.TURNED_OFF);
                }
            }
        }
    }

}