/* eslint-env worker */
import { StorProcAPI } from '@niftysave/storproc/api'
import { VinylAPI } from '@niftysave/vinyl/api'
import { FollowupAPI } from '@niftysave/followup/api'
import { Orch } from './Orch.js'

/** @type KVNamespace */
// @ts-ignore
const store = self.STATE
// @ts-ignore
const storProc = new StorProcAPI({ endpoint: new URL(self.STORPROC_ENDPOINT), username: self.STORPROC_USERNAME, password: self.STORPROC_PASSWORD })
// @ts-ignore
const vinyl = new VinylAPI({ endpoint: new URL(self.VINYL_ENDPOINT), username: self.VINYL_USERNAME, password: self.VINYL_PASSWORD })
// @ts-ignore
const followup = new FollowupAPI({ endpoint: new URL(self.FOLLOWUP_ENDPOINT), username: self.FOLLOWUP_USERNAME, password: self.FOLLOWUP_PASSWORD })
const orch = new Orch({ store, storProc, vinyl, followup })

addEventListener('scheduled', event => event.waitUntil(orch.run()))
