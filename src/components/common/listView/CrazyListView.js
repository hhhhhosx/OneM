/**
 * Created by guangqiang on 2017/9/15.
 */
'use strict'
var React = require('react');

var {
  ListView,
  Platform,
  TouchableHighlight,
  View,
  Text,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
} = require('react-native');

import shallowEqual from '../../../../node_modules/fbjs/lib/shallowEqual'

function shallowCompare(instance, nextProps, nextState) {
  return !shallowEqual(instance.props, nextProps) || !shallowEqual(instance.state, nextState);
}

// small helper function which merged two objects into one
function MergeRecursive(obj1, obj2) {
  for (var p in obj2) {
    try {
      if (obj2[p].constructor == Object) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch (e) {
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

var GiftedListView = React.createClass({

  getDefaultProps() {
    return {
      customStyles: {},
      initialListSize: 10,
      onEndReachedThreshold: 100,
      onEndReachedEventThrottle: 1000,
      firstLoader: true,
      pagination: true,
      refreshable: true,
      refreshableColors: undefined,
      refreshableProgressBackgroundColor: undefined,
      refreshableSize: undefined,
      refreshableTitle: undefined,
      refreshableTintColor: undefined,
      renderRefreshControl: null,
      headerView: null,
      sectionHeaderView: null,
      scrollEnabled: true,
      withSections: false,
      autoPaginate: false,
      lazyLoade:false,
      onFetch(page, callback, options) { callback([]); },

      paginationFetchingView: null,
      paginationAllLoadedView: null,
      paginationWaitingView: null,
      emptyView: null,
      renderSeparator: null,
      rowHasChanged: null,
      distinctRows: null,

      rows: null,
      fetchOptions: null,
    };
  },

  propTypes: {
    customStyles: React.PropTypes.object,
    initialListSize: React.PropTypes.number,
    onEndReachedThreshold: React.PropTypes.number,
    onEndReachedEventThrottle: React.PropTypes.number,
    firstLoader: React.PropTypes.bool,
    pagination: React.PropTypes.bool,
    refreshable: React.PropTypes.bool,
    refreshableColors: React.PropTypes.array,
    refreshableProgressBackgroundColor: React.PropTypes.string,
    refreshableSize: React.PropTypes.string,
    refreshableTitle: React.PropTypes.string,
    refreshableTintColor: React.PropTypes.string,
    renderRefreshControl: React.PropTypes.func,
    headerView: React.PropTypes.func,
    sectionHeaderView: React.PropTypes.func,
    scrollEnabled: React.PropTypes.bool,
    withSections: React.PropTypes.bool,
    autoPaginate: React.PropTypes.bool,
    lazyLoade: React.PropTypes.bool,
    onFetch: React.PropTypes.func,

    paginationFetchingView: React.PropTypes.func,
    paginationAllLoadedView: React.PropTypes.func,
    paginationWaitingView: React.PropTypes.func,
    emptyView: React.PropTypes.func,
    renderSeparator: React.PropTypes.func,

    rowHasChanged: React.PropTypes.func,
    distinctRows: React.PropTypes.func,
    rows: React.PropTypes.array,
    fetchOptions: React.PropTypes.object,
  },

  _setPage(page) { this._page = page; },
  _getPage() { return this._page; },
  _setRows(rows) { this._rows = rows; },
  _getRows() { return this._rows; },

  paginationFetchingView() {
    if (this.props.paginationFetchingView) {
      return this.props.paginationFetchingView();
    }

    return (
      <View style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}>
        <ActivityIndicator />
      </View>
    );
  },
  paginationAllLoadedView() {
    if (this.props.paginationAllLoadedView) {
      return this.props.paginationAllLoadedView();
    }

    return (
      <View style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}>
        <Text style={[this.defaultStyles.actionsLabel, this.props.customStyles.actionsLabel]}>
          ~
        </Text>
      </View>
    );
  },
  paginationWaitingView(paginateCallback) {
    if (this.props.paginationWaitingView) {
      return this.props.paginationWaitingView(paginateCallback);
    }

    return (
      <TouchableHighlight
        underlayColor='#c8c7cc'
        onPress={paginateCallback}
        style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}
      >
        <Text style={[this.defaultStyles.actionsLabel, this.props.customStyles.actionsLabel]}>
          Load more
        </Text>
      </TouchableHighlight>
    );
  },
  headerView() {
    if (this.state.paginationStatus === 'firstLoad' || !this.props.headerView) {
      return null;
    }
    return this.props.headerView();
  },
  emptyView(refreshCallback) {
    if (this.props.emptyView) {
      return this.props.emptyView(refreshCallback);
    }

    return (
      <View style={[this.defaultStyles.defaultView, this.props.customStyles.defaultView]}>
        <Text style={[this.defaultStyles.defaultViewTitle, this.props.customStyles.defaultViewTitle]}>
          Sorry, there is no content to display
        </Text>

        <TouchableHighlight
          underlayColor='#c8c7cc'
          onPress={refreshCallback}
        >
          <Text>
            ↻
          </Text>
        </TouchableHighlight>
      </View>
    );
  },
  renderSeparator() {
    if (this.props.renderSeparator) {
      return this.props.renderSeparator();
    }

    return (
      <View style={[this.defaultStyles.separator, this.props.customStyles.separator]} />
    );
  },

  getInitialState() {
    this._setPage(this.props.pageId ? this.props.pageId : 1);
    this._setRows([]);
    this.refreshedAt = new Date;

    var ds = null;
    if (this.props.withSections === true) {
      ds = new ListView.DataSource({
        rowHasChanged: this.props.rowHasChanged ? this.props.rowHasChanged : (row1, row2) => row1 !== row2,
        sectionHeaderHasChanged: (section1, section2) => section1 !== section2,
      });
      return {
        dataSource: ds.cloneWithRowsAndSections(this._getRows()),
        isRefreshing: false,
        paginationStatus: 'firstLoad',
      };
    } else {
      ds = new ListView.DataSource({
        rowHasChanged: this.props.rowHasChanged ? this.props.rowHasChanged : (row1, row2) => row1 !== row2,
      });
      return {
        dataSource: ds.cloneWithRows(this._getRows()),
        isRefreshing: false,
        paginationStatus: 'firstLoad',
      };
    }
  },

  componentDidMount() {
    // this.props.onFetch(this._getPage(), this._postRefresh, { firstLoad: true });

    this._fetch(this._getPage(), { firstLoad: true, ...this.props.fetchOptions });

    //imperative OOP state utilized since onEndReached is imperatively called. So why waste cycles on rendering, which
    //can cause loss of frames in animation.
    this.lastGrantAt = this.lastReleaseAt = this.lastEndReachedAt = this.lastManualRefreshAt = this.lastPaginateUpdateAt = new Date;
  },

  setNativeProps(props) {
    this.refs.listview.setNativeProps(props);
  },

  scrollTo(config) {
    this.refs.listview.scrollTo(config);
  },

  refresh(options) {
    return this._refresh(options);
  },

  _refresh(options) {
    //can trigger scrollview to push past endReached threshold if you are already scrolled down when you call this
    this.lastManualRefreshAt = new Date;
    this._onRefresh(Object.assign({
      external: true,
      mustSetLastManualRefreshAt: true, //we pass it along, so when the rows are updated we know to store the date as well
    }, options));

    this.scrollTo({ y: 0 });
  },

  _onRefresh(options = {}) {
    options = { ...this.props.fetchOptions, ...options };
    if (this.isMounted()) {
      this.refs.refreshControl && this.refs.refreshControl.setIsRefreshing(true);
      this._setPage(1);
      this.refreshedAt = new Date;
      let page = this._getPage();
      this._fetch(page, options);
    }
  },

  _fetch(page, beforeOptions, postCallback) {
    postCallback = postCallback || this._postRefresh;
    this.beforeOptions = beforeOptions;
    this.props.onFetch(page, (rows, options) => {
      if(this.props.lazyLoade){
        InteractionManager.runAfterInteractions(() => {
          postCallback(rows, Object.assign(beforeOptions, options));
        })
      }else{
        postCallback(rows, Object.assign(beforeOptions, options));
      }
    }, beforeOptions);
  },

  shouldComponentUpdate(nextProps, nextState) {
    let rows = nextProps.rows;
    let shouldUpdate = true;

    if (rows !== this.props.rows) {
      if (this.beforeOptions && this.beforeOptions.paginatedFetch) {
        setTimeout(() => {
          this._postPaginate(rows, { ...this.beforeOptions, allLoaded: nextProps.allLoaded });
        }, 1000);
      } else {
        let timeSinceRefresh = new Date - this.refreshedAt;
        let delay = timeSinceRefresh > 1000 ? 0 : 1000 - timeSinceRefresh;
        setTimeout(() => {
          this._postRefresh(rows, this.beforeOptions);
        }, delay);
      }
      shouldUpdate = false;
    } else if (nextProps.fetchOptions !== this.props.fetchOptions) {
      this.refresh(nextProps.fetchOptions);
      return false;
    }
    this.beforeOptions = {};
    return shouldUpdate ? shallowCompare(this, nextProps, nextState) : false;
  },

  _postRefresh(rows = [], options = {}) {
    if (this.isMounted()) {
      this._updateRows(rows, options, true);
    }
  },

  _onPaginate() {
    if (this.state.paginationStatus === 'allLoaded') return;

    if (this.state.paginationStatus === 'firstLoad' || this.state.paginationStatus === 'waiting') {
      this.setState({ paginationStatus: 'fetching' });
      this._fetch(this._getPage() + 1, { paginatedFetch: true, ...this.props.fetchOptions }, this._postPaginate);
    }
  },

  _postPaginate(rows = [], options = {}) {
    this._setPage(this._getPage() + 1);
    var mergedRows = null;
    if (this.props.withSections === true) {
      mergedRows = MergeRecursive(this._getRows(), rows);
    } else {
      if (this.props.dontConcat) {
        mergedRows = rows; //because rows are already concatenated for use in a Redux store that needs access to all rows
      } else {
        mergedRows = this._getRows().concat(rows);
      }
    }

    if (this.props.distinctRows) {
      mergedRows = this.props.distinctRows(mergedRows);
    }

    this.lastPaginateUpdateAt = new Date;

    this._updateRows(mergedRows, options);
  },

  _updateRows(rows = [], options = {}, isRefresh=false) {
    let state = {
      paginationStatus: (options.allLoaded === true || rows.length === 0 ||
      rows.length % this.props.limit === 0 ||
      (this._prevRowsLength === rows.length && !isRefresh || (this.props.limit && rows.length < this.props.limit))
        ? 'allLoaded' : 'waiting'),
    };

    this._prevRowsLength = rows.length;

    if (options.mustSetLastManualRefreshAt) this.lastManualRefreshAt = new Date;

    if (rows !== null) {
      this._setRows(rows);

      if (this.props.withSections === true) {
        state.dataSource = this.state.dataSource.cloneWithRowsAndSections(rows);
      } else {
        state.dataSource = this.state.dataSource.cloneWithRows(rows);
      }
    }

    this.setState(state, this.props.onRefresh);

    var _refreshControl = this.refs.refreshControl
    // 防止刷新listview，位置错乱
    setTimeout(() => {
      _refreshControl && _refreshControl.setIsRefreshing(false);
    }, 500)

    //this must be fired separately or iOS will call onEndReached 2-3 additional times as
    //the ListView is filled. So instead we rely on React's rendering to cue this task
    //until after the previous state is filled and the ListView rendered. After that,
    //onEndReached callbacks will fire. See onEndReached() above.
    if (!this.firstLoadCompleteAt) this.firstLoadCompleteAt = new Date;
  },

  onEndReached() {
    //firstLoadCompleteAte prevents any onEndReached firings in initial rendering. There is usuallyl 2 such firings you don't want.
    if (!this.firstLoadCompleteAt || new Date - this.firstLoadCompleteAt < 1000) return;

    //lastPaginateUpdateAt solves the issue where paginationView's disappearing trigger onEndReached.
    //This happens when you're near the end of the page and the dissapperance of the pagination view
    //triggers onEndReached. The timing is so small so as not to disrupt other regular scrolling behavior.
    if (new Date - this.lastPaginateUpdateAt < 300) return;

    //lastManualRefreshAt handles the case where you call _refresh(), which if you do while the page is near the end
    //will trigger onEndReached even though you just moments ago manually refreshed.
    if (new Date - this.lastManualRefreshAt < 300) return;

    //Here's the bread and butter of strong event firing management in regards to when the user in fact does want lots of pagination refreshes:

    //The base case is simply lastEndReachedAt, which very easily can fire, so we want to block that while still allowing for
    //fast scrolling. If you scroll to the end of the page again within one second (fast scrolling), it will know you want more based
    //on lastReleasedAt (you will have to have released multiple times to scroll fast). lastGrantAt is for if you have short rows
    //and/or a low # of rows per page and you're able to move to the end without even releasing your finger.
    if (new Date - this.lastEndReachedAt < (this.props.onEndReachedEventThrottle || 1000)) {
      if (new Date - this.lastGrantAt < 3000) return; //we can likely lower this number,
      if (new Date - this.lastReleaseAt < 3000) return; //or make it configurable via props, but I think making it configurable will be unwanted added complexity for client developers
    }

    this.lastEndReachedAt = new Date;

    if (this.props.autoPaginate) {
      this._onPaginate();
    }
    if (this.props.onEndReached) {
      this.props.onEndReached();
    }
  },

  onResponderGrant() {
    this.lastGrantAt = new Date;
  },
  onResponderRelease() {
    this.lastReleaseAt = new Date;
  },

  _renderPaginationView() {
    let paginationEnabled = this.props.pagination === true || this.props.autoPaginate === true;

    if ((this.state.paginationStatus === 'fetching' && paginationEnabled) || (this.state.paginationStatus === 'firstLoad' && this.props.firstLoader === true)) {
      return this.paginationFetchingView();
    } else if (this.state.paginationStatus === 'waiting' && this.props.pagination === true && (this.props.withSections === true || this._getRows().length > 0)) { //never show waiting for autoPaginate
      return this.paginationWaitingView(this._onPaginate);
    } else if (this.state.paginationStatus === 'allLoaded' && paginationEnabled && this._getRows().length > 0) {
      return this.paginationAllLoadedView();
    } else if (this._getRows().length === 0) {
      return this.emptyView(this._onRefresh);
    } else {
      return null;
    }
  },

  renderRefreshControl() {
    if (this.props.renderRefreshControl) {
      return this.props.renderRefreshControl({ onRefresh: this._onRefresh });
    }
    return (
      <RefreshControlWithState
        ref='refreshControl'
        onRefresh={this._onRefresh}
        refreshing={this.state.isRefreshing}
        colors={this.props.refreshableColors}
        progressBackgroundColor={this.props.refreshableProgressBackgroundColor}
        size={this.props.refreshableSize}
        tintColor={this.props.refreshableTintColor}
        title={this.props.refreshableTitle}
      />
    );
  },

  render() {
    return (
      <ListView
        ref="listview"
        dataSource={this.state.dataSource}
        renderRow={this.props.rowView}
        renderSectionHeader={this.props.sectionHeaderView}
        renderHeader={this.headerView}
        renderFooter={this._renderPaginationView}
        renderSeparator={this.renderSeparator}

        onResponderGrant={this.onResponderGrant}
        //onResponderMove={this.onResponderMove}
        onResponderRelease={this.onResponderRelease}
        //onMomentumScrollEnd={this.onMomentumScrollEnd}

        //check out this thread: https://github.com/facebook/react-native/issues/1410
        //and this stackoverflow post: http://stackoverflow.com/questions/33350556/how-to-get-onpress-event-from-scrollview-component-in-react-native
        //basically onScrollAnimationEnd is incorrect (onMomentumScrollEnd is the right one) and all the native event callbacks
        //are available, but no documented. Often times library developers do not want to build
        //on top of such things. But my opinion in this case obviously is we should. The responderRelease code in call edonEndReached() is extremely stable and clear.
        //I am willing to maintain this for a while, so in the rare case these become available,
        //I will find something out. In all likelihood, only better APIs that are closer
        //to our precise needs and do not require all this still will become available. When they do, I will implement them. But at the same timeout
        //I find it unlikely that PanResponder methods that ScrollViews are based on will disappear, even if they remain undocumented for a long time.

        onEndReached={this.onEndReached}
        onEndReachedThreshold={this.props.onEndReachedThreshold || 100} //new useful prop, yay!

        automaticallyAdjustContentInsets={false}
        scrollEnabled={this.props.scrollEnabled}
        canCancelContentTouches={true}
        refreshControl={this.props.refreshable === true ? this.renderRefreshControl() : null}

        {...this.props}

        style={this.props.style}
      />
    );
  },

  defaultStyles: {
    separator: {
      height: 1,
      backgroundColor: '#CCC',
    },
    actionsLabel: {
      fontSize: 20,
    },
    paginationView: {
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFF',
    },
    defaultView: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    defaultViewTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
    },
  },
});

export {GiftedListView}

class RefreshControlWithState extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = { isRefreshing: false };
  }

  setIsRefreshing(isRefreshing) {
    this.setState({ isRefreshing });
  }

  render() {
    return (
      <RefreshControl
        {...this.props}
        refreshing={this.state.isRefreshing}
      />
    );
  }
}