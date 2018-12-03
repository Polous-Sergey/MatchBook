const mongoose = require('mongoose');
const request = require('request');
const Event = mongoose.model('Event');
const Horse = mongoose.model('Horse');
const Price = mongoose.model('Price');

function requestPromise(options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) reject(error);

            if (response && response.statusCode === 200) {
                if (typeof body === 'object') {
                    return resolve(body);
                }
                try {
                    return resolve(JSON.parse(body));
                } catch (err) {
                    console.error('cant parse string to json', err);
                    return reject(body);
                }
            } else {
                console.log('error status', response.statusCode);
                if (typeof body === 'object') {
                    return resolve(body);
                }
                try {
                    return resolve(JSON.parse(body));
                } catch (err) {
                    console.error('cant parse string to json', err);
                    return reject(body);
                }
            }
        });
    });
}

function getEvents() {
    let to = new Date();
    to.setHours(23, 59, 59, 999);
    let options = {
        method: 'GET',
        url: 'https://api.matchbook.com/edge/rest/events?sport-ids=24735152712200&per-page=500&before=' + Math.round(to.getTime() / 1000)
    };
    return requestPromise(options);
}

async function eventParser() {
    let {events} = await getEvents();

    let result = await Promise.all(events.map(async (event) => {
        if (event.markets[0].name !== 'WIN') return;
        let horseIds = await Promise.all(event.markets[0].runners.map(async (runner) => {
            let price = await savePrice(runner.prices);
            let horse = await saveHorse(runner, [price._id]);
            return horse._id
        }));

        return await saveEvent(event, horseIds);
    }));

    return await result;
}

async function savePrice(prices) {
    let priceBack = prices.find(price => price.side === 'back');
    let priceLay = prices.find(price => price.side === 'lay');
    let price = new Price();
    if (priceLay) {
        price.lay = priceLay.odds;
        price.amountLay = priceLay['available-amount'];
    }
    if (priceBack) {
        price.back = priceBack.odds;
        price.amountBack = priceBack['available-amount'];
    }

    return await price.save();
}

async function saveHorse(runner, priceIds) {
    let spaceIndex = runner.name.search(" ");

    let horseName = runner.name;
    let horseNumber = 0;

    if (!(spaceIndex === -1 || spaceIndex > 2)) {
        horseName = runner.name.slice(spaceIndex + 1);
        horseNumber = runner.name.slice(0, spaceIndex);
    }

    let horse = new Horse();
    horse.runnerId = runner.id;
    horse.name = horseName;
    horse.number = horseNumber;
    horse.prices = priceIds;
    return await horse.save();
}

async function saveEvent(event, horseIds) {
    let eventSave = new Event();
    eventSave.marketId = event.markets[0].id;
    eventSave.name = event.name;
    eventSave.start = Date.parse(event.start);
    eventSave.horses = horseIds;
    return await eventSave.save();
}

async function get(req, res) {
    // let result = await eventParser();

    // reSubscriber();


    res.json({
        success: true,
        // data: result,
        // data: await Event.find({start: {$gt: Date.now()}}).deepPopulate('horses.prices'),
        // data: await Event.find({}, ['name', 'start', 'created', 'horses']).deepPopulate('horses.prices'),
        // data: await Event.find().deepPopulate('horses.prices'),
        // sss: await getEvents()
    });


}

async function getJson(req, res) {
    let from = Date.parse(req.query.date);
    let to = new Date(req.query.date).setHours(23, 59, 59, 999);

    let data = await Event.find({
        start: {
            $gt: from,
            $lt: to
        }
    }, ['name', 'start', 'created', 'horses']).deepPopulate('horses.prices');

    res.json({
        success: true,
        data: data
    });
}

async function deleteByDate(date) {
    let from = Date.parse(date);
    let to = new Date(date).setHours(23, 59, 59, 999);

    let events = await Event.find({start: {$gt: from, $lt: to}}, ['horses']).populate({
        path: 'horses',
        select: 'prices'
    });

    Event.deleteMany({
        _id: {
            $in: events.map(event => {
                Horse.deleteMany({
                    _id: {
                        $in: event.horses.map(horse => {
                            Price.deleteMany({
                                _id: {
                                    $in: horse.prices
                                }
                            },err => console.error('price', err));
                            return horse._id
                        })
                    }
                },err => console.error('horse', err));
                return event._id
            })
        }
    }, err => console.error('event', err));

    return events
}

async function getJsonList(req, res) {
    let result = [];
    let data = await Event.find({}, ['start']);

    data.forEach((message) => {
        let index = -1;
        if (result.length > 0) {
            index = result.findIndex((item) => {
                return item.date === formatDate(message.start);
            });
        }

        if (index === -1) {
            result.push({
                date: formatDate(message.start),
                events: 1
            });
        } else {
            result[index].events++;

        }
    });

    res.json({
        data: result,
        success: true,
    });
}

async function deleteEventsByDate(req, res) {
    res.json({
        success: true,
        data: await deleteByDate(req.query.date)
    });
}

function formatDate(date) {
    let d = new Date(+date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// eventParser();

module.exports = {
    eventParser,
    get,
    getJson,
    getJsonList,
    deleteEventsByDate,
    deleteByDate,
    formatDate
};
