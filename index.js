const WebSocketServer = require("ws").WebSocketServer;
const uuid = require("uuid").v4;

const wss = new WebSocketServer({ port: 3000 });

var conns = new Map();

function handle_connection(ws) {
	const id = uuid();
	conns.set(id, {
		ws: ws,
		lectok: null,
		id: id,
	});
	ws.on("message", function (rawData) {
		let data;
		try {
			data = JSON.parse(rawData);
		} catch (err) {
			ws.send(
				JSON.stringify({
					target: "self",
					type: "error",
					data: err,
				})
			);
			return;
		}

		if (data.xLECTOK != null) {
			conns.set(id, {
				ws: ws,
				lectok: data.xLECTOK,
				id: id,
			});
			ws.send(
				JSON.stringify({
					target: "self",
					type: "success",
					data: "Setting lec token was a success",
				})
			);
			return;
		}

		if (conns.get(id).lectok === null) {
			ws.send(
				JSON.stringify({
					target: "self",
					type: "error",
					data: 'Please set a lec token before sending messages. Set a lec token by sending payload { "xLECTOK": "<channel>" }.',
				})
			);
			return;
		}

		let self = conns.get(id);

		conns.forEach(function (client) {
			if (client.id !== id && client.lectok === self.lectok) {
				client.ws.send(JSON.stringify(data));
			}
		});
	});
	ws.on("disconnect", function () {
		conns.delete(id);
	});
}

wss.on("connection", handle_connection);
wss.on("error", function (err) {
	wss.clients.forEach(function (client) {
		client.send(
			JSON.stringify({
				target: "control",
				type: "error",
				data: err,
			})
		);
	});
});
wss.on("listening", function () {
	console.log("Running at port", wss.address().port);
});
