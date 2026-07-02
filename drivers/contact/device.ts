import Homey from 'homey';
import MyApp from '../../app';
import { ContactSensor } from '../../lib/ContactSensor';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    let contactSensor: ContactSensor = (((this.homey.app as MyApp)._client?.devices?.find(e => e.id == this.getData().serialNumber && e.channel == this.getData().channel)) as ContactSensor)!;

    this.log(this.getName() + ' initialized');

    let isOpen = contactSensor.isOpen();
    this.setCapabilityValue("alarm_contact", isOpen);

    contactSensor.on(ContactSensor.OPENED, () => {
      this.log(this.getName() + ' opened');
      this.setCapabilityValue("alarm_contact", true);
    })

    contactSensor.on(ContactSensor.CLOSED, () => {
      this.log(this.getName() + ' closed');
      this.setCapabilityValue("alarm_contact", false);
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
