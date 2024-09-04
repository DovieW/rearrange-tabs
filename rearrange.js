chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  let version;

  try {
    version = Number(previousVersion.split('.')[0]);
  } catch(e) {
    version = 3;
  }

  // Display only when updating from v2 to v3
  if (reason == 'update' && version == 2) {
    await chrome.tabs.create({ 'url': chrome.runtime.getURL('updated.html' )});
  }
});

chrome.commands.onCommand.addListener(async (cmd) => {
  const MOVE_LEFT = 'rtl';
  const MOVE_RIGHT = 'rtr';
  const MOVE_FRONT = 'rtf';
  const MOVE_BACK = 'rtb';

  // let allTabs = await chrome.tabs.query({ currentWindow: true });
  // let pinned = await chrome.tabs.query({ currentWindow: true, pinned: true });
  let highlightedTabs = await chrome.tabs.query({ currentWindow: true, highlighted: true, pinned: false });
  // let highlightedPinnedTabs = await chrome.tabs.query({ currentWindow: true, highlighted: true, pinned: true });

  switch (cmd) {
    case MOVE_LEFT:
      moveTabs(highlightedTabs, highlightedTabs[0].index - 1, cmd);
      break;
    case MOVE_RIGHT:
      moveTabs(highlightedTabs, highlightedTabs[highlightedTabs.length - 1].index + 1, cmd);
      break;
    case MOVE_BACK:
      moveTabs(highlightedTabs, -1, cmd);
      break;
    case MOVE_FRONT:
      moveTabs(highlightedTabs, 0, cmd);
      break;
    default:
  }
});

async function moveTabs(tabs, destIndex, cmd) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const { skipClosedGroups } = await chrome.storage.sync.get({ skipClosedGroups: true });
  let tabsGoingRight = cmd === 'rtr' || cmd === 'rtb';
  const tabIds = tabs.map((tab) => tab.id);
  const firstTab = tabs[0];
  const goingToFrontOrBack = cmd === 'rtf' || cmd === 'rtb';
  let groupSkipped = false;
  let isTabInGroup = firstTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE;
  let tabToBeReplaced = allTabs[destIndex]; // If undefined, then the tab is being moved to the end

  if (!goingToFrontOrBack && (destIndex < 0 || destIndex >= allTabs.length)) {
    if (isTabInGroup) {
      chrome.tabs.ungroup(tabIds);
    }
    return;
  }

  let isTabToBeReplacedInGroup = (!goingToFrontOrBack && tabToBeReplaced && destIndex !== -1 && tabToBeReplaced.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) || false;
  let group;
  if (isTabToBeReplacedInGroup) group = await chrome.tabGroups.get(tabToBeReplaced.groupId);

  if (isTabInGroup && !isTabToBeReplacedInGroup) {
    chrome.tabs.ungroup(tabIds);
    if (!goingToFrontOrBack) return;
  } else if (skipClosedGroups && isTabToBeReplacedInGroup) {
    if (!isTabInGroup && isTabToBeReplacedInGroup && !group.collapsed) {
      chrome.tabs.group({ tabIds: tabIds, groupId: tabToBeReplaced.groupId });
      return;
    }

    while (destIndex >= 0 && destIndex < allTabs.length) {
      tabToBeReplaced = allTabs[destIndex];

      if (tabToBeReplaced.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE || tabToBeReplaced.groupId === firstTab.groupId) {
        break;
      }

      group = await chrome.tabGroups.get(tabToBeReplaced.groupId);
      if (!group.collapsed) {
        break;
      }

      groupSkipped = true;
      tabsGoingRight ? destIndex++ : destIndex--;
      destIndex = Math.max(0, destIndex);
    }
  }

  if (groupSkipped) tabsGoingRight ? destIndex-- : destIndex++; // Move tab just outside the group
  chrome.tabs.move(tabIds, { index: destIndex });
}
