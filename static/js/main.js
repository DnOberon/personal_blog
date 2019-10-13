$(function() { 


    // =============================
    // SEARCH
    // =============================

    $('.js-nav-search-button').click(function() { 
        if (typeof ga === 'function') {
            ga('send', 'event', { eventCategory: 'search', eventAction: 'click' });
        }
        var area = $('.search-form');
        if (area.length > 0) {
            // Early return for pages with search form already open
            // e.g. home page and search page itself
            if (area.hasClass('non-close')) {
                area.find('input[type="text"]').focus();
                return false;
            }
            if (area.hasClass('hidden')) {
                // Open
                $('.search-form-bg').show().fadeOut(1500);
                // Slide down form + focus
                area.removeClass('hidden').hide().slideDown('fast', function() {
                    area.find('input[type="text"]').focus();
                });
            } else {
                // Close
                $('.search-form-bg').hide();
                area.addClass('hidden');
            }
            return false;
        }
    });


    // =============================
    // SUBSCRIBE
    // =============================

    $('.js-nav-subscribe-button').click( function() {
        if (typeof ga === 'function') {
            ga('send', 'event', {
                eventCategory: 'subscribe',
                eventAction: 'click',
                transport: 'beacon'
            });
        }
    });


    // =============================
    // ABOUT
    // =============================

    var prompt = $('#cmd-prompt');
    if (prompt.length) {
        var cmds = [
            $('template#cmd-1').html().trim(),
            $('template#cmd-2').html().trim().replace('&gt;', '>').replace('&gt;', '>'),
            $('template#cmd-3').html().trim(),
            $('template#cmd-4').html().trim(),
            $('template#cmd-5').html().trim(),
        ];

        setTimeout( function() {
            prompt.val(cmds[0]);

            setTimeout( function() {
                prompt.val(prompt.val() + ' ' + cmds[1]);

                setTimeout( function() {
                    prompt.val(prompt.val() + ' ' + cmds[2]); // clear

                    setTimeout( function() {
                        prompt.val('$');

                        setTimeout( function() {
                            prompt.val(prompt.val() + ' ' + cmds[3]);

                            setTimeout( function() {
                                prompt.val(prompt.val() + "\n\n" + cmds[4] + ' ');
                                prompt.scrollTop(prompt[0].scrollHeight);
                                prompt.focus();
                            }, 700);
                        }, 700);
                    }, 700);
                }, 1500);
            }, 1500);
        }, 600);
    }


    // =============================
    // DONATE
    // =============================

    $('.dontate-button').submit( function() {
        if (typeof ga === 'function') {
            ga('send', 'event', {
                eventCategory: 'donate',
                eventAction: 'submit',
                transport: 'beacon'
            });
        }
    })


});