'use strict';

//const listen = require('./src/lib/listener');
const game = require('./src/game');
const game_instance = new game();

//game_instance.new_player("76561197998372252", [{ appid: '730', contextid: '2', assetid: '4254790278', classid: '926978479', instanceid: '0', amount: 1, missing: false, icon_url: '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFAuhqSaKWtEu43mxtbbk6b1a77Twm4Iu8Yl3bCU9Imii1Xt80M5MmD7JZjVLFH-6VnQJQ', icon_url_large: '', icon_drag_url: '', name: 'Skrzynia Chroma 2', market_hash_name: 'Chroma 2 Case', market_name: 'Skrzynia Chroma 2', name_color: 'D2D2D2', background_color: '', type: 'Pojemnik - Standardowej jakości', tradable: true, marketable: true, commodity: true, market_tradable_restriction: 7, fraudwarnings: [], id: '4254790278', actions: [], owner_actions: [], market_marketable_restriction: 0, value: 203 }]);
game_instance.get_winner("23de198ed59c468f5ff7511b28f60e3c0c509857b55e59215c1f8cda971d55f1", "4.902228177525103");