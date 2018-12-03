const schedule = require('node-schedule');
const eventParser = require('../controllers/matchbook').eventParser;
const deleteByDate = require('../controllers/matchbook').deleteByDate;
const formatDate = require('../controllers/matchbook').formatDate;
const reSubscriber = require('../controllers/watcher').reSubscriber;

schedule.scheduleJob({hour: 10, minute: 0}, async function () {
    await eventParser();
    reSubscriber();
});

schedule.scheduleJob({hour: 1, minute: 0}, async function () {
    let date = new Date();
    date.setDate(date.getDate() - 2);
    deleteByDate(formatDate(date))
});