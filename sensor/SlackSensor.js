/*    Copyright 2018 Firewalla LLC
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const log = require('../net2/logger.js')(__filename);
const fConfig = require('../net2/config.js').getConfig();
const Sensor = require('./Sensor.js').Sensor;

const sem = require('../sensor/SensorEventManager.js').getInstance();

const AlarmManager2 = require('../alarm/AlarmManager2');
const am2 = new AlarmManager2();

const rclient = require('../util/redis_manager.js').getRedisClient()

const slack = require('../extension/slack/slack.js');
const f = require('../net2/Firewalla.js');
const fc = require('../net2/config.js');

let callback = async (event) => {
  const alarm = am2.jsonToAlarm(event.alarm);
  const alarmMessage = alarm.localizedNotification();
  const groupName = await rclient.getAsync("groupName");
  const message = `[${groupName}] ${alarmMessage}`;
  await slack.postMessage(message);
};

class SlackSensor extends Sensor {
  async run() {
    // Disable slack for production or beta
    if (f.isProductionOrBeta()) {
      return;
    }

    const featureName = "slack";

    if (fc.isFeatureOn(featureName)) {
      this.sub();
    }

    fc.onFeature(featureName, async (feature, status) => {
      if(feature != featureName) {
        return;        
      }
      
      if(status) {
        this.sub();
      } else {
        this.unsub();
      }
    })
  }

  sub() {
    sem.on('Alarm:NewAlarm', callback);
  }

  unsub() {
    sem.off('Alarm:NewAlarm', callback);
  }
}

module.exports = SlackSensor;
