/** @typedef {{ info: import("./Vinyl").NFTInfo, metadata: any, links: import("./Vinyl").Link[] }} NFTFixture */

/** @type {NFTFixture[]} */
export const nfts = [
  {
    info: {
      chain: 'eth',
      contract: '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0',
      tokenID: '6714',
      tokenURI: 'https://ipfs.pixura.io/ipfs/QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    },
    metadata: {
      name: 'SUMMER & THE GIANTESS (22473517x )',
      createdBy: 'VISIONES',
      yearCreated: '2019',
      description: 'This symmetrical mixed media illustration is a dedication to the band \'SUMMER & THE GIANTESS\' . The first draft was created on a smartphone in 11.10.2019, and was completed on 19.10.2019 . ',
      image: 'https://ipfs.pixura.io/ipfs/QmbBJC44fG6mhroRU7T8zDhWGjwg56Th6C3eYPp7Z2WPPq',
      tags: [
        'mixedmedia',
        ' illustration',
        ' scifi',
        ' concept',
        ' retro',
        ' symmetry',
        ' visionary',
        ' surreal',
        ' portrait',
        '  symbolic',
        ' rare',
        ' punkrock',
        ' aesthetic',
        ' smartphoneart',
        ' psychedelic',
        ' portrait'
      ]
    },
    links: [
      { cid: 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH', name: 'metadata.json' },
      { cid: 'QmbBJC44fG6mhroRU7T8zDhWGjwg56Th6C3eYPp7Z2WPPq', name: 'https://ipfs.pixura.io/ipfs/QmbBJC44fG6mhroRU7T8zDhWGjwg56Th6C3eYPp7Z2WPPq' }
    ]
  }
]
