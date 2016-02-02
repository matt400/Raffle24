$(function() {
	var socket = io("http://51.254.126.185");
	var iScrollPos = 0;
	var messages = 0;
	var stop_scrolling = false;

	socket.on('connect', function() {
		$('.messages_').append("<div class='message connect_message'>Dołączono do czatu...</div>");
	});

	socket.on('users_dc', function(data) {
		$("#luc").html("<span class='fa fa-users'></span> " + data);
	});

	socket.on('chat', function(data) {
		$('.messages_').append(data);
		if(!stop_scrolling) {
			$('.messages').scrollTop($('.messages').height());
		}
		if(messages >= 20) {
			$('.message:first').remove();
		}
		messages++;
	});

	socket.on('chat_error', function(data) {
		$(".chat_info").text(data);
	});

	$('.message_text').keypress(function(e) {
		if (e.which == 13) {
			socket.emit('send_message', { msg: $('.message_text').val() });
			$('.message_text').val('');
			return false;
		}
	});

	$('.scroll').TrackpadScrollEmulator();
	$(document).on("click", ".nav_link", function() {
		var data = $(this).data("menu"),
		m = $(".modal"),
		modal = $('.modal[data-menu="' + data + '"');
		m.hide();
		$(".nav_link").removeClass("menu_active");
		$(this).addClass("menu_active");
		modal.show();
	});
	$(document).on("click", ".close_", function() {
		$(this).closest(".modal").hide();
		$(".nav_link").removeClass("menu_active");
	});
});