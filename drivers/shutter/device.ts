import Homey from 'homey';
import MyApp from '../../app';
import { Shutter } from '../../lib/Shutter';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    let shutter: Shutter = (((this.homey.app as MyApp)._client?.devices?.find(e => e.id == this.getData().serialNumber && e.channel == this.getData().channel)) as Shutter)!;

    this.registerCapabilityListener("onoff", async (value) => {
      this.log(this.getName() + ' ' + value);
      if (value) {
        await shutter.open();
      }
      else {
        await shutter.close();
      }
    });

    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      this.log(this.getName() + ' state ' + value);
      if (value === 'up') {
        await shutter.open();
      } else if (value === 'down') {
        await shutter.close();
      } else {
        await shutter.stop();
      }
    });

    this.log(this.getName() + ' initialized');

    let isOn = !shutter.isClosed();
    this.setCapabilityValue("onoff", isOn);
    this.setCapabilityValue("windowcoverings_state", shutter.getState());

    shutter.on(Shutter.OPENED, () => {
      this.log(this.getName() + ' opened');
      this.setCapabilityValue("onoff", true);
      this.setCapabilityValue("windowcoverings_state", 'up');
    })

    shutter.on(Shutter.CLOSED, () => {
      this.log(this.getName() + ' closed');
      this.setCapabilityValue("onoff", false);
      this.setCapabilityValue("windowcoverings_state", 'down');
    })

    shutter.on(Shutter.STOPPED, () => {
      this.log(this.getName() + ' stopped');
      this.setCapabilityValue("windowcoverings_state", 'idle');
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
