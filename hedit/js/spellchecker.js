javascript: (function(){

    function main() {
        var text = document.body.innerHTML;
        text = text.replace(/<.*?>/g, ' ');
        text = text.replace(/[^а-яА-ЯёЁ]/g, ' ');
        text = text.replace(/\s+/g, ' ');

        var fragments = splitByLimit(text, 10000);
        for (var i = 0, len = fragments.length; i < len; i++) {
            checkAndReplace(fragments[i]);
        }
    }

    // Max size of request is 10000 bytes.
    // Function splits big texts into fragments
    function splitByLimit (text, limit) {
        var fragments = [],
            words = text.split(' '),
            fragment = [],
            fragmentLen = 0;

        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            // one letter = 6 bytes: %D0%BA
            if (fragmentLen + word.length*6 > limit) {
                fragments.push(fragment.join(' '));
                fragment = [];
                fragmentLen = 0;
            }
            fragment.push(word);
            fragmentLen += word.length*6 + 3; // + space: %20 = 3 symbols

            // last word
            if (i == words.length - 1) {
                fragments.push(fragment.join(' '));
            }
        }
        return fragments;
    }

    function checkAndReplace(text) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (xhr.status == 200) {
                    data = JSON.parse(xhr.responseText);
                    replaceWords(data);
                } else {
                    console.log(xhr.status);
                }
            }
        }
		
		targetUrl = "http://speller.yandex.net/services/spellservice.json/checkText?options=7&text=" + encodeURIComponent( text );
		xhr.open("GET", targetUrl, true);
		xhr.send();
    }

    function replaceWords(data) {
        if (!data) return;
        var body = document.body.innerHTML;
        for (var i = 0, len = data.length; i < len; i++) {
            var subst = data[i];
            if (subst.s.length !== 0 && subst.word.length > 0) {
                //var replacement =  '<span style="background-color: #cfc">' + subst.s[0] + ' </span>';
                var replacement = '';
                replacement += '<span style="color:rgb(255,0,0);text-decoration: underline;"><span>' + subst.word.split('').join('</span><span>') + '</span></span>';
                //var regexp = new RegExp( subst.word );
                var regexp = new RegExp( "(^\|[ \n\r\t.,'\"\+!?-]+)" + subst.word + "([ \n\r\t.,'\"\+!?-]+\|$)" );
                
				//replacement = '\$1*\$2*\$3';
				body = body.replace(regexp, replacement);
            }
        }
        document.body.innerHTML = body;
    }

    window.onload = main;

})();