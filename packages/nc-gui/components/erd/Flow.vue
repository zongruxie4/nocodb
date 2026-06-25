<script setup lang="ts">
import { Background, Controls, Panel, PanelPosition } from '@vue-flow/additional-components'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { TableType } from 'nocodb-sdk'
import type { ERDConfig } from './utils'
import { useErdElements } from './utils'

interface Props {
  tables: TableType[]
  config: ERDConfig
}

const props = defineProps<Props>()

const { tables, config } = toRefs(props)

const {
  $destroy,
  fitView,
  viewport,
  setMaxZoom,
  onNodeDoubleClick,
  zoomIn: internalZoomIn,
  zoomOut: internalZoomOut,
} = useVueFlow({ minZoom: 0.05, maxZoom: 2 })

const { layout, elements } = useErdElements(tables, config)

const showSkeleton = computed(() => viewport.value.zoom < 0.15)

// Fit the whole diagram into view. Allow zooming out far enough that every
// node is on-screen (large schemas like sakila spread wide under the LR dagre
// layout), but cap zoom-in so small graphs don't blow up. `minZoom: 0.2` stays
// above the 0.15 skeleton threshold so the fit never collapses nodes into
// skeleton mode. Previously this kept the current zoom (1) and only
// re-centered, leaving outer nodes off-screen — present in the DOM but hidden.
//
// Run instantly (duration 0): an animated fit transits through intermediate
// zoom levels, and if it dips below 0.15 mid-animation it flips `showSkeleton`
// → re-layout → fights this fit. A snap fit lands directly on the target zoom.
function fitWholeView() {
  fitView({
    duration: 0,
    padding: 0.1,
    minZoom: 0.2,
    maxZoom: 1,
  })
}

async function init() {
  await layout(showSkeleton.value)
  await nextTick()
  // `fitView` needs measured node dimensions; right after mount they can still
  // be pending, so a single fit sometimes computes off bounds (the viewport
  // stays at zoom 1 and outer nodes render hidden). Retry across a few frames
  // until the viewport actually leaves the initial zoom, making the framing
  // deterministic regardless of mount/measure timing.
  let attempts = 0
  const tryFit = () => {
    fitWholeView()
    attempts += 1
    if (viewport.value.zoom >= 1 && attempts < 12) {
      setTimeout(tryFit, 80)
    }
  }
  setTimeout(tryFit, 80)
}

function zoomIn(nodeId?: string) {
  fitView({ nodes: nodeId ? [nodeId] : undefined, duration: 200, minZoom: 0.2 })
}

onNodeDoubleClick(({ node }) => {
  if (showSkeleton.value) zoomIn()

  setTimeout(() => {
    zoomIn(node.id)
  }, 250)
})

watch(tables, init, { flush: 'post', immediate: true })
watch(showSkeleton, async (isSkeleton) => {
  layout(isSkeleton).then(() => {
    if (!isSkeleton) return
    // Center content without changing zoom level
    fitView({
      duration: 300,
      padding: 0.1,
      minZoom: viewport.value.zoom,
      maxZoom: viewport.value.zoom,
    })
  })
})

watch(elements, (elements) => {
  if (elements.length > 3) {
    setMaxZoom(2)
  } else {
    setMaxZoom(1.25)
  }
})

onScopeDispose($destroy)
</script>

<template>
  <VueFlow v-model="elements" class="nc-erd-flow">
    <Controls
      class="bg-transparent rounded-lg shadow-md border-1 border-nc-border-gray-medium"
      :position="PanelPosition.BottomLeft"
      :show-fit-view="false"
      :show-interactive="false"
    >
      <template #control-zoom-in>
        <div class="nc-erd-zoom-btn rounded-t-md" @click="internalZoomIn">
          <GeneralIcon icon="plus" />
        </div>
      </template>
      <template #control-zoom-out>
        <div class="nc-erd-zoom-btn border-t-1 border-nc-border-gray-medium rounded-b-lg" @click="internalZoomOut">
          <GeneralIcon icon="minus" />
        </div>
      </template>
    </Controls>

    <template #node-custom="{ data, dragging }">
      <ErdTableNode :data="data" :dragging="dragging" :show-skeleton="showSkeleton" />
    </template>

    <template #edge-custom="edgeProps">
      <ErdRelationEdge v-bind="edgeProps" :show-skeleton="showSkeleton" />
    </template>

    <Background :size="showSkeleton ? 2 : undefined" :gap="showSkeleton ? 50 : undefined" />

    <Transition name="layout">
      <Panel
        v-if="showSkeleton && config.showAllColumns"
        :position="PanelPosition.BottomCenter"
        class="color-transition z-5 cursor-pointer rounded shadow-sm text-nc-content-gray-muted font-semibold px-4 py-2 bg-nc-bg-gray-extralight hover:(text-nc-content-gray-emphasis ring ring-accent ring-opacity-100 bg-nc-bg-gray-light)"
        @click="zoomIn"
      >
        {{ $t('labels.zoomInToViewColumns') }}
      </Panel>
    </Transition>

    <slot />
  </VueFlow>
</template>

<style>
.vue-flow__controls {
  @apply !bg-transparent;
}

.nc-erd-zoom-btn {
  @apply bg-nc-bg-default px-1.5 py-1 hover:(bg-nc-bg-gray-light text-nc-content-gray) cursor-pointer text-nc-content-gray-subtle2;
}

.nc-erd-flow {
  width: 100%;
  height: 100%;
}

.vue-flow__node-custom {
  @apply border-nc-border-gray-medium;
}

.nc-erd-flow .vue-flow__viewport {
  /* Ensure the viewport uses the full space for proper centering */
  width: 100%;
  height: 100%;
}
</style>
