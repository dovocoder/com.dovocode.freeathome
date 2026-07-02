import { Client } from './Client';
import { EventEmitter } from 'events';
export class Thermostat extends EventEmitter {

    private readonly currentHeatingEnabledDataPoint: string = 'odp0000';
    private readonly getHeatingEnabledDataPoint: string = 'odp0008';
    private readonly setHeatingEnabledDataPoint: string = 'idp0012';
    private readonly heatingEnabledValue: string = '1';
    private readonly heatingDisabledValue: string = '0';
    private readonly currentTemperatureDataPoint: string = 'odp0010';
    private readonly getTargetTemperatureDataPoint: string = 'odp0006';
    private readonly setTargetTemperatureDataPoint: string = 'idp0016';
    static HEATING_TURNED_ON = 'heating on';
    static HEATING_TURNED_OFF = 'heating off';
    static TARGET_TEMPERATURE_CHANGED = 'target temperature changed';
    static TEMPERATURE_CHANGED = 'temperature changed';

    static CURRENT_HEATING_TURNED_ON = 'current heating on';
    static CURRENT_HEATING_TURNED_OFF = 'current heating off';
    private lastTemperature: number | null = null;

    constructor (public client: Client, public id: string, public channel: string, public name: string, public deviceType: string, public datapoints: { [key: string]: any }) {
        super();
    }

    public async enableAutoHeating () {
        this.datapoints[this.setHeatingEnabledDataPoint] = this.heatingEnabledValue;
        this.datapoints[this.getHeatingEnabledDataPoint] = this.heatingEnabledValue;
        await this.client.setValue(this.id, this.channel, this.setHeatingEnabledDataPoint, this.heatingEnabledValue);
    }

    public async disableHeating () {
        this.datapoints[this.setHeatingEnabledDataPoint] = this.heatingDisabledValue;
        this.datapoints[this.getHeatingEnabledDataPoint] = this.heatingDisabledValue;
        await this.client.setValue(this.id, this.channel, this.setHeatingEnabledDataPoint, this.heatingDisabledValue);
    }

    getCurrentHeatingEnabled () {
        return this.datapoints[this.currentHeatingEnabledDataPoint] === this.heatingEnabledValue;
    }
    getHeatingEnabled () {
        return this.datapoints[this.getHeatingEnabledDataPoint] === this.heatingEnabledValue;
    }
    getCurrentTemperature () {
        return parseFloat(this.datapoints[this.currentTemperatureDataPoint])
    }
    getTargetTemperature () {
        return this.lastTemperature || parseFloat(this.datapoints[this.getTargetTemperatureDataPoint]);
    }

    public async setTargetTemperature (targetTemperature: number) {
        this.lastTemperature = targetTemperature;
        await this.client.setValue(this.id, this.channel, this.setTargetTemperatureDataPoint, targetTemperature.toString());
    }


    handleUpdate (datapoint: string, value: any) {
        if (datapoint === this.getHeatingEnabledDataPoint) {
            if (value == this.heatingEnabledValue) {
                if (value != this.datapoints[datapoint]) {
                    this.datapoints[datapoint] = value;
                    this.emit(Thermostat.HEATING_TURNED_ON);
                }
            } else if (value === this.heatingDisabledValue) {
                if (value != this.datapoints[datapoint]) {
                    this.datapoints[datapoint] = value;
                    this.emit(Thermostat.HEATING_TURNED_OFF);
                }
            }
        }
        if (datapoint === this.currentTemperatureDataPoint) {
            if (value != this.datapoints[datapoint]) {
                this.datapoints[datapoint] = value;
                this.emit(Thermostat.TEMPERATURE_CHANGED);
            }
        }
        if (datapoint === this.getTargetTemperatureDataPoint) {
            if (value != this.datapoints[datapoint]) {
                this.datapoints[datapoint] = value;
                if (value != 7) {
                    this.lastTemperature = parseFloat(value);
                }
                this.emit(Thermostat.TARGET_TEMPERATURE_CHANGED);
            }
        }
        if (datapoint === this.currentHeatingEnabledDataPoint) {
            if (value == this.heatingEnabledValue) {
                if (value != this.datapoints[datapoint]) {
                    this.datapoints[datapoint] = value;
                    this.emit(Thermostat.CURRENT_HEATING_TURNED_ON);
                }
            } else if (value === this.heatingDisabledValue) {
                if (value != this.datapoints[datapoint]) {
                    this.datapoints[datapoint] = value;
                    this.emit(Thermostat.CURRENT_HEATING_TURNED_OFF);
                }
            }
        }
    }
}