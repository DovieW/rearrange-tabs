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

  // let all = await chrome.tabs.query({ currentWindow: true });
  let allTabs = await chrome.tabs.query({ currentWindow: true });
  let pinned = await chrome.tabs.query({ currentWindow: true, pinned: true });
  let highlightedTabs = await chrome.tabs.query({ currentWindow: true, highlighted: true, pinned: false });
  let highlightedPinnedTabs = await chrome.tabs.query({ currentWindow: true, highlighted: true, pinned: true });
  // const currentIndex = all.findIndex(tab => tab.highlighted);
  // const activeTab = await chrome.tabs.query({active: true})[0];
  // let activeTabs = tabs.filter(tab => tab.active);
  // const activeTab = allTabs.find(tab => tab.active);

  // We attempt to move pinned tabs only if they're available
  switch (cmd) {
    case MOVE_LEFT:
      // if (highlightedPinnedTabs.length > 0) moveLeft(highlightedPinnedTabs, 0);
      // moveLeft(highlightedTabs, pinned.length);
      moveTabs(highlightedTabs, highlightedTabs[0].index - 1, cmd);
      break;
    case MOVE_RIGHT:
      // if (highlightedPinnedTabs.length > 0) moveRight(highlightedPinnedTabs, pinned.length);
      // moveRight(highlightedTabs, all.length);
      moveTabs(highlightedTabs, highlightedTabs[highlightedTabs.length - 1].index + 1, cmd);
      break;
    case MOVE_BACK:
      // if (highlightedPinnedTabs.length > 0) moveBack(highlightedPinnedTabs, pinned.length);
      // moveBack(highlightedTabs, all.length);
      // moveBack(highlightedTabs);
      moveTabs(highlightedTabs, -1, cmd);
      break;
    case MOVE_FRONT:
      // if (highlightedPinnedTabs.length > 0) moveFront(highlightedPinnedTabs, 0);
      // moveFront(highlightedTabs, pinned.length);
      // moveFront(highlightedTabs);
      moveTabs(highlightedTabs, 0, cmd);
      break;
    default:
  }
});

/**
 * Each tab has its own range. This depends on the type, pinned
 * or unpinned. It also depends on how many tabs are currently
 * highlighted.
 * pinned tabs: <position in the highlighted pinned tabs list> to <right most end of the pinned tabs>
 * unpinned tabs: <position after pinned tabs + position in the highlighted unpinned tabs list> to <position in the highlighted unpinned tabs list from the right most end>
 * When moving left, we update highlighted tabs from left to right, the natural order
 * When moving right, we update highlighted tabs from right to left - this avoids a lot of UI bugs
*/

// function moveLeft(highlightedTabs, offset) {
// function moveLeft(highlightedTabs, activeTab) {
  // moveTabs(highlightedTabs.map((highlightedTab, i) => [highlightedTab, Math.max(offset + i, highlightedTab.index - 1)]));
// }

// function moveFront(highlightedTabs, offset) {
// function moveFront(highlightedTabs) {
  // moveTabs(highlightedTabs.map((highlightedTab, i) => [highlightedTab, offset + i]));
// }

// function moveRight(highlightedTabs, lengthOfAllTabsOfCurrentType) {
// function moveRight(highlightedTabs) {
  // let offset = lengthOfAllTabsOfCurrentType - highlightedTabs.length;
  // let tabs = Array(highlightedTabs.length);
  //
  // for (let i = highlightedTabs.length - 1; i >= 0; i--) {
  //   tabs[highlightedTabs.length - i - 1] = [highlightedTabs[i], Math.min(offset + i, highlightedTabs[i].index + 1)];
  // }

  // moveTabs(tabs);
// }

// function moveBack(highlightedTabs, lengthOfAllTabsOfCurrentType) {
// function moveBack(highlightedTabs) {
  // let tabs = Array(highlightedTabs.length);
  //
  // for (let i = highlightedTabs.length - 1; i >= 0; i--) {
  //   let idx = highlightedTabs.length - i - 1;
  //   tabs[idx] = [highlightedTabs[i], lengthOfAllTabsOfCurrentType - idx - 1];
  // }
  //
  // moveTabs(tabs);

// }

async function moveTabs(tabs, destIndex, cmd) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const { skipClosedGroups } = await chrome.storage.sync.get({ skipClosedGroups: true });
  // let tabsGoingRight = tabs[0][1] > tabs[0][0].index;
  // let tabsGoingRight = destIndex > tabs[0].index;
  let tabsGoingRight = cmd === 'rtr' || cmd === 'rtb';
  const tabIds = tabs.map((tab) => tab.id);
  const firstTab = tabs[0];
  // const goingToFrontOrBack = (destIndex === 0 && firstTab.index !== 1) || (destIndex === -1 && firstTab.index !== allTabs.length - 1);
  const goingToFrontOrBack = cmd === 'rtf' || cmd === 'rtb';

  if (!goingToFrontOrBack && (destIndex < 0 || destIndex >= allTabs.length)) return;

  // for (let [tab, pos] of tabs) {
    // tab = chrome.tab.query({ id: tab.id }); // Prevent situation where 
    // let finalPos = pos;
    let groupSkipped = false;
    let isTabInGroup = firstTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE;
    let tabToBeReplaced = allTabs[destIndex]; // If undefined, then the tab is being moved to the end
    // if (tabToBeReplaced === undefined && isTabInGroup) {
    //   // chrome.tabs.ungroup([tab.id]);
    //   chrome.tabs.ungroup(tabIds);
    // }
    let isTabToBeReplacedInGroup = tabToBeReplaced && destIndex !== -1 ? tabToBeReplaced.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE : false;
    let group;

    if (isTabToBeReplacedInGroup) group = await chrome.tabGroups.get(tabToBeReplaced.groupId);

    if (isTabInGroup && !isTabToBeReplacedInGroup) {
      // chrome.tabs.ungroup([tab.id]);
      chrome.tabs.ungroup(tabIds);
      if (!goingToFrontOrBack) return;
    } else if (skipClosedGroups && isTabToBeReplacedInGroup) {
      if (!isTabInGroup && isTabToBeReplacedInGroup && !group.collapsed) {
        // chrome.tabs.group({ tabIds: [tab.id], groupId: tabToBeReplaced.groupId });
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
    // }
  }
  if (groupSkipped) tabsGoingRight ? destIndex-- : destIndex++; // Move tab just outside the group
  // chrome.tabs.move(tab.id, { index: destIndex });
  chrome.tabs.move(tabIds, { index: destIndex });
}
