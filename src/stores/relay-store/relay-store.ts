import { isArrayInArray } from 'lib/isArrayInArray'
import { values } from 'mobx'
import { applySnapshot, Instance, SnapshotOut, types } from 'mobx-state-tree'
import { withEnvironment, withRootStore } from '../_extensions'
import * as actions from './relay-actions'
import { Event, EventModel } from './relay-models'

export const RelayStoreModel = types
  .model('RelayStore')
  .props({
    events: types.optional(types.map(EventModel), {}),
  })
  .extend(withEnvironment)
  .extend(withRootStore)
  .actions((self) => ({
    /** Connect to Nostr relays */
    connect: async (): Promise<void> => await actions.connect(self as RelayStore),
    /** Send a message to channel */
    sendChannelMessage: async (channelId: string, text: string): Promise<void> =>
      await actions.sendChannelMessage(self as RelayStore, channelId, text),
    /** Save event to store */
    addEvent: (event: Event) => {
      self.events.set(event.id, event)
    },
    /** Reset this store to original state */
    reset() {
      applySnapshot(self, {})
    },
  }))
  .views((self) => ({
    /** Get event by id */
    getEventById(id: string) {
      return self.events.get(id)
    },
    /** Return channels as list of normalized events with kind 40 */
    get channels() {
      const events = values(self.events) as any
      return events
        .filter(
          (event: Event) =>
            event.pubkey === '72e40635ef243ce4937b0083593af773d35487b3b5147f47d4d62576e97cd2f9'
        )
        .filter((event: Event) => event.created_at >= 1660780018)
        .filter((event: Event) => event.kind === 40)
        .map((event: Event) => {
          const channelInfo = JSON.parse(event.content)
          const { about, name, picture } = channelInfo
          return {
            ...event,
            name,
            about,
            picture,
          }
        })
    },
    /** Return messages for channel */
    getMessagesForChannel(channelId: string) {
      const events = values(self.events) as any
      return (
        events
          .filter((event: Event) => event.kind === 42)
          .filter((event: Event) => isArrayInArray(['#e', channelId], event.tags))
          // .map((event: Event) => {
          //   const messageInfo = JSON.parse(event.content)
          //   const { message, sender } = messageInfo
          //   return {
          //     ...event,
          //     message,
          //     sender,
          //   }
          // })
          .sort((a: Event, b: Event) => a.created_at - b.created_at)
      )
    },
  }))

type RelayStoreType = Instance<typeof RelayStoreModel>
export interface RelayStore extends RelayStoreType {}
type RelayStoreSnapshotType = SnapshotOut<typeof RelayStoreModel>
export interface RelayStoreSnapshot extends RelayStoreSnapshotType {}
export const createRelayStoreDefaultModel = () => types.optional(RelayStoreModel, {})