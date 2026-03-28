    (function loadLiveCapsulesBeforeBoot() {
        // Volume-first override: if a live capsule JSON is available, use it for this boot.
        var defaults = [
            'kbatch-capsules.live.json',
            '/kbatch-capsules.live.json'
        ];
        var query = new URLSearchParams(window.location.search || '');
        var queryPath = query.get('capsules');
        if (queryPath) defaults.unshift(queryPath);
        var lsPath = '';
        try { lsPath = localStorage.getItem('kbatch-live-capsules-url') || ''; } catch (_) {}
        if (lsPath) defaults.unshift(lsPath);
        var seen = {};
        var endpoints = defaults.filter(function(p) {
            if (!p || seen[p]) return false;
            seen[p] = true;
            return true;
        });

        for (var i = 0; i < endpoints.length; i++) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', endpoints[i], false);
                xhr.send(null);
                if (xhr.status !== 200 || !xhr.responseText) continue;
                var doc = JSON.parse(xhr.responseText);
                var capsules = Array.isArray(doc) ? doc : (Array.isArray(doc.capsules) ? doc.capsules : null);
                if (!capsules) continue;
                window.kbatchCapsulesGenerated = capsules;
                window.kbatchCapsulesSource = endpoints[i];
                console.log('[kbatch] live capsules loaded:', endpoints[i], capsules.length);
                return;
            } catch (_) {}
        }
    })();
