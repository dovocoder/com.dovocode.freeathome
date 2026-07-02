import { Switch } from './Switch';
import { Dimmer } from './Dimmer';
import { Thermostat } from './Thermostat';
import { SceneSensor } from './SceneSensor';
import { Shutter } from './Shutter';
import { Blind } from './Blind';
import { MovementDetector } from './MovementDetector';
import { ContactSensor } from './ContactSensor';
import ws from 'ws';
import fetch from 'node-fetch';

/** Base type for all free@home device classes */
export type Device =
  | Switch
  | Dimmer
  | Thermostat
  | SceneSensor
  | Shutter
  | Blind
  | MovementDetector
  | ContactSensor;

/**
 * free@home function IDs (hex, as returned by the SysAP configuration API).
 * The API returns functionID as a 4-char lowercase hex string, e.g. "0007".
 * We compare the upper-cased, zero-padded value.
 */
const FID = {
  SCENE_SENSOR: '0006',          // 0x006
  SWITCH_ACTUATOR: '0007',       // 0x007
  SHUTTER_ACTUATOR: '0009',      // 0x009
  WINDOW_DOOR_SENSOR: '000F',   // 0x00F
  MOVEMENT_DETECTOR: '0011',     // 0x011
  DIMMING_ACTUATOR: '0012',      // 0x012
  BLIND_ACTUATOR: '0061',        // 0x061
  ROOM_TEMP_CONTROLLER: '0023',  // 0x023 (35 decimal — NOT "23"!)
} as const;

/** Maximum websocket reconnect backoff (ms) */
const MAX_RECONNECT_DELAY = 30000;
/** Initial websocket reconnect backoff (ms) */
const INITIAL_RECONNECT_DELAY = 1000;

export class Client {
  _login: string = '';
  devices?: Device[];

  _connection?: ws;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _reconnectDelay = INITIAL_RECONNECT_DELAY;
  private _shouldReconnect = true;

  constructor(
    public host: string,
    public username: string,
    public password: string,
  ) {
    if (host && username && password) {
      this._login =
        'Basic ' +
        Buffer.from(username + ':' + password, 'utf8').toString('base64');
    }
  }

  async updateLogin(
    host: string,
    username: string,
    password: string,
  ): Promise<void> {
    if (host && username && password) {
      this.host = host;
      this.username = username;
      this.password = password;
      this._login =
        'Basic ' +
        Buffer.from(username + ':' + password, 'utf8').toString('base64');
      this.stopListen();
      await this.loadDevices();
      this.listen();
    }
  }

  async start(): Promise<void> {
    if (this._login) {
      await this.loadDevices();
      this.listen();
    }
  }

  /**
   * Normalise a functionID value from the API.
   * The SysAP returns hex strings like "0007" (already 4 chars) but some
   * firmware versions return short forms like "7". We zero-pad to 4 chars
   * and uppercase so "7", "07", "0007", "0007" all compare correctly.
   */
  private static normaliseFunctionId(fid: string): string {
    if (fid == null) return '';
    const trimmed = String(fid).trim().toUpperCase();
    // Already a 4-char hex like "0007"
    if (/^[0-9A-F]{4}$/.test(trimmed)) return trimmed;
    // Short decimal or hex — parse as integer then format as 4-hex
    const num = parseInt(trimmed, 16);
    if (!Number.isNaN(num)) {
      return num.toString(16).toUpperCase().padStart(4, '0');
    }
    // Fallback: just pad the raw string
    return trimmed.padStart(4, '0');
  }

  async getConfiguration(): Promise<any[]> {
    const req = await fetch(
      'http://' + this.host + '/fhapi/v1/api/rest/configuration',
      {
        headers: {
          Authorization: this._login,
        },
      },
    );
    const resp: any = await req.json();
    return Object.entries(
      resp['00000000-0000-0000-0000-000000000000'].devices,
    ).flatMap(([id, device]: [string, any]) => {
      return Object.entries(device.channels).flatMap(
        ([key, channel]: [string, any]) => {
          return {
            id: id,
            channel: key,
            name: channel.displayName,
            deviceType: channel.functionID,
            datapoints: {
              ...Object.fromEntries(
                Object.entries(channel.inputs).map(([k, i]: [string, any]) => {
                  return [k, i.value];
                }),
              ),
              ...Object.fromEntries(
                Object.entries(channel.outputs).map(
                  ([k, i]: [string, any]) => {
                    return [k, i.value];
                  },
                ),
              ),
            },
          };
        },
      );
    });
  }

  async loadDevices(): Promise<void> {
    const devices = await this.getConfiguration();
    this.devices = devices
      .map((device: any): Device | null => {
        const fid = Client.normaliseFunctionId(device.deviceType);

        switch (fid) {
          case FID.SWITCH_ACTUATOR:
            return new Switch(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          case FID.DIMMING_ACTUATOR:
            return new Dimmer(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          case FID.ROOM_TEMP_CONTROLLER:
            return new Thermostat(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          case FID.SCENE_SENSOR:
            return new SceneSensor(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          case FID.SHUTTER_ACTUATOR:
            return new Shutter(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          case FID.BLIND_ACTUATOR:
            return new Blind(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          case FID.MOVEMENT_DETECTOR:
            return new MovementDetector(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          case FID.WINDOW_DOOR_SENSOR:
            return new ContactSensor(
              this,
              device.id,
              device.channel,
              device.name,
              fid,
              device.datapoints,
            );
          default:
            return null;
        }
      })
      .filter((e): e is Device => e !== null);
  }

  /**
   * Connect to the SysAP websocket with exponential backoff reconnection.
   * Instead of reconnecting immediately on close (which can spam the server),
   * we wait with exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s max.
   */
  listen(): void {
    this._shouldReconnect = true;
    this._connect();
  }

  private _connect(): void {
    if (!this._shouldReconnect) return;

    this._connection = new ws('ws://' + this.host + '/fhapi/v1/api/ws', {
      headers: {
        Authorization: this._login,
      },
    });

    this._connection.onopen = () => {
      // Reset backoff on successful connection
      this._reconnectDelay = INITIAL_RECONNECT_DELAY;
    };

    this._connection.onmessage = (event: ws.MessageEvent) => {
      const parsed = JSON.parse(event.data as string)?.[
        '00000000-0000-0000-0000-000000000000'
      ]?.datapoints;
      if (parsed) {
        Object.entries(parsed).forEach(
          ([key, value]: [string, any]) => {
            const parts = key.split('/');
            if (parts.length < 3) return;
            const device = this.devices?.find(
              (e) => e.id === parts[0] && e.channel === parts[1],
            );
            if (device) {
              device.handleUpdate(parts[2], value);
            }
          },
        );
      }
    };

    this._connection.onerror = (_event: ws.ErrorEvent) => {
      // Error will be followed by close; backoff handled in onclose
    };

    this._connection.onclose = (_event: ws.CloseEvent) => {
      this._connection = undefined;
      if (this._shouldReconnect) {
        // Schedule reconnect with backoff
        if (this._reconnectTimer) {
          clearTimeout(this._reconnectTimer);
        }
        this._reconnectTimer = setTimeout(() => {
          this._connect();
        }, this._reconnectDelay);
        // Exponential backoff with cap
        this._reconnectDelay = Math.min(
          this._reconnectDelay * 2,
          MAX_RECONNECT_DELAY,
        );
      }
    };
  }

  stopListen(): void {
    this._shouldReconnect = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._connection) {
      this._connection.close();
      this._connection = undefined;
    }
  }

  async setValue(
    device: string,
    channel: string,
    datapoint: string,
    value: any,
  ): Promise<any> {
    const req = await fetch(
      'http://' +
        this.host +
        '/fhapi/v1/api/rest/datapoint/00000000-0000-0000-0000-000000000000/' +
        device +
        '.' +
        channel +
        '.' +
        datapoint,
      {
        method: 'PUT',
        headers: {
          Authorization: this._login,
          'Content-Type': 'text/plain',
        },
        body: value,
      },
    );
    const resp: any = await req.json();
    return resp;
  }
}
