var SteamUser = require('steam-user');
var TradeOfferManager = require('steam-tradeoffer-manager');
var fs = require('fs');

var config = require('../config');

var client = new SteamUser();
var manager = new TradeOfferManager({
	"steam": client,
	"domain": "raffle24.net",
	"language": "pl"
});

var logOnOptions = {
	"accountName": config.steam_bot_username,
	"password": config.steam_bot_password
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

manager.on('newOffer', function(offer) {
	console.log(offer);
	//console.log("New offer #" + offer.id + " from " + offer.partner.getSteam3RenderedID());
	if(!offer.itemsToGive) {
		offer.accept(function(err) {
			if(err) {
				console.log("Unable to accept offer: " + err.message);
			} else {
				console.log("Offer accepted");
			}
		});
	} else {
		offer.decline();
	}
});

manager.on('receivedOfferChanged', function(offer, oldState) {
	// gdy status oferty się zmienia
	//console.log("Offer #" + offer.id + " changed: " + TradeOfferManager.getStateName(oldState) + " -> " + TradeOfferManager.getStateName(offer.state));
	console.log(offer);
	console.log(oldState);
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