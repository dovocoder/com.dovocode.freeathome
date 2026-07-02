import Homey from 'homey';
import MyApp from '../../app';
import { Dimmer } from '../../lib/Dimmer';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    let dimmer: Dimmer = (((this.homey.app as MyApp)._client?.devices?.find(e => e.id == this.getData().serialNumber && e.channel == this.getData().channel)) as Dimmer)!;

    this.registerCapabilityListener("onoff", async (value) => {
      this.log(this.getName() + ' ' + value);
      if (value) {
        await dimmer.turnOn();
      }
      else {
        await dimmer.turnOff();
      }
    });

    this.registerCapabilityListener("dim", async (value) => {
      this.log(this.getName() + ' dim ' + value);
      await dimmer.setBrightness(value);
    });

    this.log(this.getName() + ' initialized');
    let isOn = dimmer.isOn();
    let brightness = dimmer.getBrightness();

    this.setCapabilityValue("onoff", isOn);
    this.setCapabilityValue("dim", brightness);

    dimmer.on(Dimmer.TURNED_ON, () => {
      this.log(this.getName() + ' on');
      this.setCapabilityValue("onoff", true);
    })

    dimmer.on(Dimmer.TURNED_OFF, () => {
      this.log(this.getName() + ' off');
      this.setCapabilityValue("onoff", false);
    })

    dimmer.on(Dimmer.BRIGHTNESS_CHANGED, () => {
      this.log(this.getName() + ' brightness changed');
      this.setCapabilityValue("dim", dimmer.getBrightness());
    })
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded () {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings ({ oldSettings: { }, newSettings: { }, changedKeys: { } }): Promise<string | void> {
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed (name: string) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted () {
    this.log('MyDevice has been deleted');
  }

}

module.exports = MyDevice;
