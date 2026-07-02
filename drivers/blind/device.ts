import Homey from 'homey';
import MyApp from '../../app';
import { Blind } from '../../lib/Blind';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    let blind: Blind = (((this.homey.app as MyApp)._client?.devices?.find(e => e.id == this.getData().serialNumber && e.channel == this.getData().channel)) as Blind)!;

    this.registerCapabilityListener("onoff", async (value) => {
      this.log(this.getName() + ' ' + value);
      if (value) {
        await blind.open();
      }
      else {
        await blind.close();
      }
    });

    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      this.log(this.getName() + ' state ' + value);
      if (value === 'up') {
        await blind.open();
      } else if (value === 'down') {
        await blind.close();
      } else {
        await blind.stop();
      }
    });

    this.registerCapabilityListener("windowcoverings_tilt", async (value) => {
      this.log(this.getName() + ' tilt ' + value);
      await blind.setTilt(value);
    });

    this.log(this.getName() + ' initialized');

    let isOn = !blind.isClosed();
    this.setCapabilityValue("onoff", isOn);
    this.setCapabilityValue("windowcoverings_state", blind.getState());
    this.setCapabilityValue("windowcoverings_tilt", blind.getTilt());

    blind.on(Blind.OPENED, () => {
      this.log(this.getName() + ' opened');
      this.setCapabilityValue("onoff", true);
      this.setCapabilityValue("windowcoverings_state", 'up');
    })

    blind.on(Blind.CLOSED, () => {
      this.log(this.getName() + ' closed');
      this.setCapabilityValue("onoff", false);
      this.setCapabilityValue("windowcoverings_state", 'down');
    })

    blind.on(Blind.STOPPED, () => {
      this.log(this.getName() + ' stopped');
      this.setCapabilityValue("windowcoverings_state", 'idle');
    })

    blind.on(Blind.TILT_CHANGED, () => {
      this.log(this.getName() + ' tilt changed');
      this.setCapabilityValue("windowcoverings_tilt", blind.getTilt());
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
