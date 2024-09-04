document.addEventListener('DOMContentLoaded', function() {
  let skipClosedGroups = document.getElementById('skipClosedGroups');

  chrome.storage.sync.get({skipClosedGroups: true}, function(data) {
    skipClosedGroups.checked = data.skipClosedGroups;
  });

  skipClosedGroups.addEventListener('change', function() {
    chrome.storage.sync.set({skipClosedGroups: this.checked});
  });
});
