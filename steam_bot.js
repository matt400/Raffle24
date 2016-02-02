var SteamUser = require('steam-user');
var TradeOfferManager = require('steam-tradeoffer-manager');
var fs = require('fs');

var client = new SteamUser();
var manager = new TradeOfferManager({
	"steam": client, // Polling every 30 seconds is fine since we get notifications from Steam
	"domain": "raffle24.pl", // Our domain is example.com
	"language": "pl" // We want English item descriptions
});

// Steam logon options
var logOnOptions = {
	"accountName": "raffle24bot1",
	"password": "raffleO1M2D3"
};

if(fs.existsSync('polldata.json')) {
	manager.pollData = JSON.parse(fs.readFileSync('polldata.json'));
}

client.logOn(logOnOptions);

client.on('loggedOn', function() {
	client.setPersona(SteamUser.Steam.EPersonaState.Online);
	//client.gamesPlayed(730);
	console.log("Logged into Steam");
});

client.on('webSession', function(sessionID, cookies) {
	manager.setCookies(cookies, function(err) {
		if(err) {
			console.log(err);
			process.exit(1); // Fatal error since we couldn't get our API key
			return;
		}

		console.log("Got API key: " + manager.apiKey);
	});
});

/*

{ partner: { universe: 1, type: 1, instance: 1, accountid: 38106524 },
  _countering: null,
  _tempData: {},
  manager:
   { _steam:
      { client: [Object],
        steamID: [Object],
        limitations: [Object],
        vac: [Object],
        wallet: [Object],
        emailInfo: [Object],
        licenses: [Object],
        users: [Object],
        groups: {},
        chats: {},
        myFriends: [Object],
        myGroups: {},
        myFriendGroups: [Object],
        _sentry: null,
        options: [Object],
        friends: [Object],
        trading: [Object],
        storage: [Object],
        _events: [Object],
        _logOnDetails: [Object],
        _onConnected: [Function] },
     _domain: 'raffle24.pl',
     _language: 'en',
     _community:
      { _jar: [Object],
        _captchaGid: -1,
        chatState: 0,
        request: [Object],
        steamID: [Object] },
     _request:
      { [Function]
        get: [Function],
        head: [Function],
        post: [Function],
        put: [Function],
        patch: [Function],
        del: [Function],
        cookie: [Function],
        jar: [Function],
        defaults: [Function] },
     _assetCache: { '730_520025252_0': [Object] },
     _pollTimer:
      { '0': null,
        _idleTimeout: -1,
        _idlePrev: null,
        _idleNext: null,
        _idleStart: 1057784594,
        _onTimeout: null,
        _repeat: false },
     _lastPoll: 1446412664016,
     pollInterval: 30000,
     cancelTime: undefined,
     pollData:
      { sent: [Object],
        received: [Object],
        offersSince: 1446412497,
        toAccept: {} },
     apiKey: '459AC3C07B51A1C966404E1946A27B53',
     steamID: { universe: 1, type: 1, instance: 1, accountid: 212012230 },
     _languageName: 'english',
     _events:
      { newOffer: [Function],
        receivedOfferChanged: [Function],
        pollData: [Function] } },
  id: '812865621',
  message: '',
  state: 2,
  itemsToGive: [],
  itemsToReceive:
   [ { appid: '730',
       contextid: '2',
       assetid: '4041118398',
       classid: '520025252',
       instanceid: '0',
       amount: 1,
       missing: false,
       icon_url: '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFMu1aPMI24auITjxteJwPXxY72AkGgIvZAniLjHpon2jlbl-kpvNjz3JJjVLFG9rl1YLQ',
       icon_url_large: '',
       icon_drag_url: '',
       name: 'Operation Breakout Weapon Case',
       market_hash_name: 'Operation Breakout Weapon Case',
       market_name: 'Operation Breakout Weapon Case',
       name_color: 'D2D2D2',
       background_color: '',
       type: 'Base Grade Container',
       tradable: true,
       marketable: true,
       commodity: true,
       market_tradable_restriction: 7,
       fraudwarnings: [],
       descriptions: [Object],
       owner_descriptions: [],
       tags: [Object],
       id: '4041118398',
       actions: [],
       owner_actions: [],
       market_marketable_restriction: 0 } ],
  isOurOffer: false,
  created: Sun Nov 01 2015 22:17:43 GMT+0100 (CET),
  updated: Sun Nov 01 2015 22:17:43 GMT+0100 (CET),
  expires: Sun Nov 15 2015 22:17:43 GMT+0100 (CET),
  tradeID: null,
  fromRealTimeTrade: false }

	## WAŻNE
	http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFMu1aPMI24auITjxteJwPXxY72AkGgIvZAniLjHpon2jlbl-kpvNjz3JJjVLFG9rl1YLQ
  */
manager.on('newOffer', function(offer) {
	console.log("New offer #" + offer.id + " from " + offer.partner.getSteam3RenderedID());
	if(!offer.itemsToGive.length) {
		offer.accept(function(err) {
			if(err) {
				console.log("Unable to accept offer: " + err.message);
			} else {
				console.log("Offer accepted");
				var itr = offer.itemsToReceive;
				itr.forEach(function(data) {
					console.log(data.descriptions);
				});
			}
		});
	} else {
		offer.cancel(function(err) {
			if(err) {
				console.log("Unable to cancel offer: " + err.message);
			} else {
				console.log("Offer canceled");
			}
		});
	}
});


manager.on('receivedOfferChanged', function(offer, oldState) {
	console.log("Offer #" + offer.id + " changed: " + TradeOfferManager.getStateName(oldState) + " -> " + TradeOfferManager.getStateName(offer.state));
	
	if(offer.state == TradeOfferManager.ETradeOfferState.Accepted) {
		offer.getReceivedItems(function(err, items) {
			if(err) {
				console.log("Couldn't get received items: " + err);
			} else {
				var names = items.map(function(item) {
					return item.name;
				});
				
				console.log("Received: " + names.join(', '));
			}
		});
	}
});

manager.on('pollData', function(pollData) {
	fs.writeFile('polldata.json', JSON.stringify(pollData));
});