const WebSocket = require('ws');
const mongoose = require('mongoose');
const Event = mongoose.model('Event');
const Horse = mongoose.model('Horse');
const Price = mongoose.model('Price');

let wsm;

let subscriptions = [];

async function reSubscriber() {
    console.log('restart socket...');

    let events = await eventToday();
    if (events.length === 0) return console.log('no event');

    wsm = new WebSocket('wss://www.matchbook.com/edge/messages');

    wsm.on('message', (data) => {
        if (data === '{"type":"ping"}') {
            try {
                wsm.send('{"type":"pong"}');
            } catch (err) {
                console.log('err pong');
            }
        } else {
            socketDataHandling(data);
        }
    });

    wsm.on('close', () => {
        console.log('disconnected!!!');
        reSubscriber();
    });
    setTimeout(() => {
        subscriber(events);
    }, 10000)
}

function parsePrice(prices) {
    let priceBack = prices.find(price => price.side === 'back');
    let priceLay = prices.find(price => price.side === 'lay');
    return {priceBack: priceBack ? priceBack : 0, priceLay: priceLay ? priceLay : 0}
}

async function savePrice(parsedPrice) {
    let price = new Price();
    if (parsedPrice.priceLay) {
        price.lay = parsedPrice.priceLay.odds;
        price.amountLay = parsedPrice.priceLay['available-amount'];
    }
    if (parsedPrice.priceBack) {
        price.back = parsedPrice.priceBack.odds;
        price.amountBack = parsedPrice.priceBack['available-amount'];
    }

    return await price.save();
}

function eventToday() {
    return Event.find({start: {$gt: Date.now() + 300000}}).populate('horses');
}

async function subscriber(events) {
    try {
        wsm.send('{"type":"parameters","data":{"currency":"USD","exchange-type":"","language":"en","odds-type":"DECIMAL","price-depth":6,"price-order":"price desc"}}');

        events.forEach((event) => {
            wsm.send('{"type":"subscriptions","data":{"interested":[{"type":"market","id":' + event.marketId + '}]}}');
            subscriptions.push({
                marketId: event.marketId,
                start: event.start,
                horses: event.horses.map((horse) => {
                    return {
                        _id: horse.id,
                        runnerId: horse.runnerId,
                        lastBack: 0,
                        lastLay: 0
                    }
                })
            });
        });
    } catch (err) {
        console.error(err);
        reSubscriber();
    }
}

async function addPriceToHorse(priceId, runnerId) {
    let horse = await Horse.findOne({runnerId: runnerId});
    console.log('price add', runnerId);
    horse.prices.push(priceId);
    horse.save();
}

function socketDataHandling(data) {
    data = JSON.parse(data);

    if (data.type === 'prices') {
        if (data.data) {
            data.data.map(async (data) => {
                if (data.prices) {
                    let subscription = subscriptions.find(event => event.marketId === data['market-id']);
                    if (!subscription) return console.log('cant find event');
                    if (subscription.start < Date.now()) return console.log('already start');
                    let horse = subscription.horses.find(horse => horse.runnerId === data.id);
                    if (!horse) return console.log('cant find horse');
                    let parsedPrice = parsePrice(data.prices);
                    if (parsedPrice.priceBack.odds === horse.lastBack && parsedPrice.priceLay.odds === horse.lastLay) return console.log('duplicate');
                    horse.lastBack = parsedPrice.priceBack.odds;
                    horse.lastLay = parsedPrice.priceLay.odds;
                    let price = await savePrice(parsedPrice);
                    addPriceToHorse(price._id, data.id);
                }
            })
        }
    } else if (data.type === 'markets' && data.data.status === 'CLOSED') {
        console.log('event is end', data.data.id);
        wsm.send('{"type":"subscriptions","data":{"not-interested":[{"type":"market","id":' + data.data.id + '}]}}');
        let index = subscriptions.findIndex(subscription => subscription.marketId === data.data.id);
        if (index !== -1) {
            subscriptions.splice(index, 1);
        }
    }
}

reSubscriber();

module.exports = {
    reSubscriber
};
