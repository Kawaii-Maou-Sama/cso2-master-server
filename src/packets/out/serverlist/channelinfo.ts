import { OutPacketBase } from 'packets/out/packet'

import { Channel } from 'channel/channel'

/**
 * sends out a channel info to an user
 * @class ServerListChannelInfo
 */
export class ServerListChannelInfo {
    private id: number
    private name: string
    private unk00: number
    private unk01: number
    private unk02: number
    private unk03: number
    private unk04: number

    constructor(channel: Channel) {
        this.id = channel.index
        this.name = channel.name
        this.unk00 = 4
        this.unk01 = 0x1F4
        this.unk02 = 1
        this.unk03 = 0
        this.unk04 = 1
    }

    public build(outPacket: OutPacketBase): void {
        outPacket.writeUInt8(this.id)
        outPacket.writeString(this.name)
        outPacket.writeUInt16(this.unk00)
        outPacket.writeUInt16(this.unk01)
        outPacket.writeUInt8(this.unk02)
        outPacket.writeUInt8(this.unk03)
        outPacket.writeUInt8(this.unk04)
    }
}
