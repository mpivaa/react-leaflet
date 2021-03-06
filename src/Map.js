// @flow

import {
  latLngBounds,
  Map as LeafletMap,
  type CRS,
  type Renderer,
} from 'leaflet'
import { omit } from 'lodash'
import React, { type Node } from 'react'

import { LeafletProvider } from './context'
import MapComponent from './MapComponent'
import updateClassName from './utils/updateClassName'
import type {
  LatLng,
  LatLngBounds,
  LeafletContext,
  MapComponentProps,
  Point,
  Viewport,
} from './types'

const OTHER_PROPS = [
  'children',
  'className',
  'id',
  'style',
  'useFlyTo',
  'whenReady',
]

const normalizeCenter = (pos: LatLng): [number, number] => {
  return Array.isArray(pos)
    ? [pos[0], pos[1]]
    : [pos.lat, pos.lon ? pos.lon : pos.lng]
}

type LeafletElement = LeafletMap

type ZoomOption = boolean | 'center'
type Props = {
  [key: string]: any,
  // Leaflet options
  preferCanvas?: boolean,
  attributionControl?: boolean,
  zoomControl?: boolean,
  closePopupOnClick?: boolean,
  zoomSnap?: number,
  zoomDelta?: number,
  trackResize?: boolean,
  boxZoom?: boolean,
  doubleClickZoom?: ZoomOption,
  dragging?: boolean,
  crs?: CRS,
  center?: LatLng,
  zoom?: number,
  minZoom?: number,
  maxZoom?: number,
  maxBounds?: LatLngBounds,
  renderer?: Renderer,
  zoomAnimation?: boolean,
  zoomAnimationThreshold?: number,
  fadeAnimation?: boolean,
  markerZoomAnimation?: boolean,
  transform3DLimit?: number,
  inertia?: boolean,
  inertiaDeceleration?: number,
  inertiaMaxSpeed?: number,
  easeLinearity?: number,
  worldCopyJump?: boolean,
  maxBoundsViscosity?: number,
  keyboard?: boolean,
  keyboardPanDelta?: number,
  scrollWheelZoom?: ZoomOption,
  wheelDebounceTime?: number,
  wheelPxPerZoomLevel?: number,
  tap?: boolean,
  tapTolerance?: number,
  touchZoom?: ZoomOption,
  bounceAtZoomLimits?: boolean,
  // Additional options
  animate?: boolean,
  bounds?: LatLngBounds,
  boundsOptions?: {
    paddingTopLeft?: Point,
    paddingBottomRight?: Point,
    padding?: Point,
    maxZoom?: number,
  },
  children: Node,
  className?: string,
  id?: string,
  style?: Object,
  useFlyTo?: boolean,
  viewport?: Viewport,
  whenReady?: () => void,
} & MapComponentProps

export default class Map extends MapComponent<LeafletElement, Props> {
  className: ?string
  contextValue: ?LeafletContext
  container: ?HTMLDivElement
  viewport: Viewport = {
    center: undefined,
    zoom: undefined,
  }

  _updating: boolean = false

  createLeafletElement(props: Props): LeafletElement {
    const { viewport, ...options } = props
    if (viewport) {
      if (viewport.center) {
        options.center = viewport.center
      }
      if (typeof viewport.zoom === 'number') {
        options.zoom = viewport.zoom
      }
    }
    return new LeafletMap(this.container, options)
  }

  updateLeafletElement(fromProps: Props, toProps: Props) {
    this._updating = true

    const {
      animate,
      bounds,
      boundsOptions,
      boxZoom,
      center,
      className,
      doubleClickZoom,
      dragging,
      keyboard,
      maxBounds,
      scrollWheelZoom,
      tap,
      touchZoom,
      useFlyTo,
      viewport,
      zoom,
    } = toProps

    updateClassName(this.container, fromProps.className, className)

    if (viewport && viewport !== fromProps.viewport) {
      const c = viewport.center ? viewport.center : center
      const z = viewport.zoom == null ? zoom : viewport.zoom
      if (useFlyTo === true) {
        this.leafletElement.flyTo(c, z, { animate })
      } else {
        this.leafletElement.setView(c, z, { animate })
      }
    } else if (center && this.shouldUpdateCenter(center, fromProps.center)) {
      if (useFlyTo === true) {
        this.leafletElement.flyTo(center, zoom, { animate })
      } else {
        this.leafletElement.setView(center, zoom, { animate })
      }
    } else if (typeof zoom === 'number' && zoom !== fromProps.zoom) {
      if (fromProps.zoom == null) {
        this.leafletElement.setView(center, zoom)
      } else {
        this.leafletElement.setZoom(zoom)
      }
    }

    if (maxBounds && this.shouldUpdateBounds(maxBounds, fromProps.maxBounds)) {
      this.leafletElement.setMaxBounds(maxBounds)
    }

    if (
      bounds &&
      (this.shouldUpdateBounds(bounds, fromProps.bounds) ||
        boundsOptions !== fromProps.boundsOptions)
    ) {
      if (useFlyTo === true) {
        this.leafletElement.flyToBounds(bounds, boundsOptions)
      } else {
        this.leafletElement.fitBounds(bounds, boundsOptions)
      }
    }

    if (boxZoom !== fromProps.boxZoom) {
      if (boxZoom === true) {
        this.leafletElement.boxZoom.enable()
      } else {
        this.leafletElement.boxZoom.disable()
      }
    }

    if (doubleClickZoom !== fromProps.doubleClickZoom) {
      if (doubleClickZoom === true) {
        this.leafletElement.doubleClickZoom.enable()
      } else {
        this.leafletElement.doubleClickZoom.disable()
      }
    }

    if (dragging !== fromProps.dragging) {
      if (dragging === true) {
        this.leafletElement.dragging.enable()
      } else {
        this.leafletElement.dragging.disable()
      }
    }

    if (keyboard !== fromProps.keyboard) {
      if (keyboard === true) {
        this.leafletElement.keyboard.enable()
      } else {
        this.leafletElement.keyboard.disable()
      }
    }

    if (scrollWheelZoom !== fromProps.scrollWheelZoom) {
      if (scrollWheelZoom === true || typeof scrollWheelZoom === 'string') {
        this.leafletElement.options.scrollWheelZoom = scrollWheelZoom
        this.leafletElement.scrollWheelZoom.enable()
      } else {
        this.leafletElement.scrollWheelZoom.disable()
      }
    }

    if (tap !== fromProps.tap) {
      if (tap === true) {
        this.leafletElement.tap.enable()
      } else {
        this.leafletElement.tap.disable()
      }
    }

    if (touchZoom !== fromProps.touchZoom) {
      if (touchZoom === true || typeof touchZoom === 'string') {
        this.leafletElement.options.touchZoom = touchZoom
        this.leafletElement.touchZoom.enable()
      } else {
        this.leafletElement.touchZoom.disable()
      }
    }

    this._updating = false
  }

  onViewportChange = () => {
    const center = this.leafletElement.getCenter()
    this.viewport = {
      center: center ? [center.lat, center.lng] : undefined,
      zoom: this.leafletElement.getZoom(),
    }
    if (this.props.onViewportChange && !this._updating) {
      this.props.onViewportChange(this.viewport)
    }
  }

  onViewportChanged = () => {
    if (this.props.onViewportChanged && !this._updating) {
      this.props.onViewportChanged(this.viewport)
    }
  }

  componentDidMount() {
    const props = omit(this.props, OTHER_PROPS)
    this.leafletElement = this.createLeafletElement(props)

    this.leafletElement.on('move', this.onViewportChange)
    this.leafletElement.on('moveend', this.onViewportChanged)

    if (props.bounds != null) {
      this.leafletElement.fitBounds(props.bounds, props.boundsOptions)
    }

    if (this.props.whenReady) {
      this.leafletElement.whenReady(this.props.whenReady)
    }

    this.contextValue = {
      layerContainer: this.leafletElement,
      map: this.leafletElement,
    }

    super.componentDidMount()
    this.forceUpdate() // Re-render now that leafletElement is created
  }

  componentDidUpdate(prevProps: Props) {
    this.updateLeafletElement(prevProps, this.props)
  }

  componentWillUnmount() {
    super.componentWillUnmount()

    this.leafletElement.off('move', this.onViewportChange)
    this.leafletElement.off('moveend', this.onViewportChanged)

    // The canvas renderer uses requestAnimationFrame, making a deferred call to a deleted object
    // When preferCanvas is set, use simpler teardown logic
    if (this.props.preferCanvas === true) {
      this.leafletElement._initEvents(true)
      this.leafletElement._stop()
    } else {
      this.leafletElement.remove()
    }
  }

  bindContainer = (container: ?HTMLDivElement): void => {
    this.container = container
  }

  shouldUpdateCenter(next: LatLng, prev: LatLng) {
    if (!prev) return true
    next = normalizeCenter(next)
    prev = normalizeCenter(prev)
    return next[0] !== prev[0] || next[1] !== prev[1]
  }

  shouldUpdateBounds(next: LatLngBounds, prev: LatLngBounds) {
    return prev ? !latLngBounds(next).equals(latLngBounds(prev)) : true
  }

  render() {
    return (
      <div
        className={this.props.className}
        id={this.props.id}
        ref={this.bindContainer}
        style={this.props.style}>
        {this.contextValue ? (
          <LeafletProvider value={this.contextValue}>
            {this.props.children}
          </LeafletProvider>
        ) : null}
      </div>
    )
  }
}
