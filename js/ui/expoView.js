// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Cinnamon = imports.gi.Cinnamon;
const St = imports.gi.St;
const Signals = imports.signals;

const DND = imports.ui.dnd;
const Main = imports.ui.main;
const ExpoThumbnail = imports.ui.expoThumbnail;

const WORKSPACE_SWITCH_TIME = 0.25;
// Note that mutter has a compile-time limit of 36
const MAX_WORKSPACES = 16;


const CONTROLS_POP_IN_TIME = 0.1;

function ExpoView() {
	this._init();
}

ExpoView.prototype = {
	_init: function() {
        this.actor = new Cinnamon.GenericContainer();
        this.actor.connect('get-preferred-width', Lang.bind(this, this._getPreferredWidth));
        this.actor.connect('get-preferred-height', Lang.bind(this, this._getPreferredHeight));
        this.actor.connect('allocate', Lang.bind(this, this._allocate));
        let controls = new St.Bin({ style_class: 'workspace-controls',
                                    request_mode: Clutter.RequestMode.WIDTH_FOR_HEIGHT,
                                    y_align: St.Align.START});
        this._controls = controls;
        this.actor.add_actor(controls);

        controls.reactive = true;
        controls.connect('scroll-event',
                         Lang.bind(this, this._onScrollEvent));
        
        this._thumbnailsBox = new ExpoThumbnail.ExpoThumbnailsBox();
        controls.add_actor(this._thumbnailsBox.actor);

        this._inDrag = false;
        this._cancelledDrag = false;

        this._windowDragBeginId = 0;
        this._windowDragCancelledId = 0;
        this._windowDragEndId = 0;
    },
    
    handleKeyPressEvent: function(actor, event) {
        return this._thumbnailsBox.handleKeyPressEvent(actor, event);
    },

    show: function() {
        this._controls.show();
        this._thumbnailsBox.show();
        
        if (this._windowDragBeginId == 0)
            this._windowDragBeginId = Main.expo.connect('window-drag-begin',
                                                            Lang.bind(this, this._dragBegin));
        if (this._windowDragCancelledId == 0)
            this._windowDragCancelledId = Main.expo.connect('window-drag-cancelled',
                                                            Lang.bind(this, this._dragCancelled));
        if (this._windowDragEndId == 0)
            this._windowDragEndId = Main.expo.connect('window-drag-end',
                                                          Lang.bind(this, this._dragEnd));

    },

    hide: function() {
        this._controls.hide();
        this._thumbnailsBox.hide();

        if (this._windowDragBeginId > 0) {
            Main.expo.disconnect(this._windowDragBeginId);
            this._windowDragBeginId = 0;
        }
        if (this._windowDragCancelledId > 0) {
            Main.expo.disconnect(this._windowDragCancelledId);
            this._windowDragCancelledId = 0;
        }
        if (this._windowDragEndId > 0) {
            Main.expo.disconnect(this._windowDragEndId);
            this._windowDragEndId = 0;
        }
    },

    _getPreferredWidth: function (actor, forHeight, alloc) {
        // pass through the call in case the child needs it, but report 0x0
        this._controls.get_preferred_width(forHeight);
    },

    _getPreferredHeight: function (actor, forWidth, alloc) {
        // pass through the call in case the child needs it, but report 0x0
        this._controls.get_preferred_height(forWidth);
    },

    _allocate: function (actor, box, flags) {
        this._controls.allocate(box, flags);
    },

    _dragBegin: function() {
        this._inDrag = true;
        this._cancelledDrag = false;
        this._firstDragMotion = true;
        this._dragMonitor = {
            dragMotion: Lang.bind(this, this._onDragMotion)
        };
        DND.addDragMonitor(this._dragMonitor);
    },

    _dragCancelled: function() {
        this._cancelledDrag = true;
        DND.removeDragMonitor(this._dragMonitor);
    },

    _onDragMotion: function(dragEvent) {
        let controlsHovered = this._controls.contains(dragEvent.targetActor);
        this._controls.set_hover(controlsHovered);

        return DND.DragMotionResult.CONTINUE;
    },

    _dragEnd: function() {
        this._inDrag = false;
        DND.removeDragMonitor(this._dragMonitor);
    },

    _onScrollEvent: function (actor, event) {
        switch ( event.get_scroll_direction() ) {
        case Clutter.ScrollDirection.UP:
            Main.wm.actionMoveWorkspaceUp();
            break;
        case Clutter.ScrollDirection.DOWN:
            Main.wm.actionMoveWorkspaceDown();
            break;
        }
    }
};
Signals.addSignalMethods(ExpoView.prototype);
