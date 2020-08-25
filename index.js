function delayLoop (fn, delay) { // min between = 0; max between = delay * 2
  return (name, i) => {
    setTimeout(() => {
      fn(name)
    }, i * delay + getRandomBetween(delay / 2, delay + delay / 2))
  }
};

function getRandomBetween (min, max) {
  return Math.random() * (max - min) + min
}

async function getListByHashtag (client, hashtag) {
  return new Promise((resolve, reject) => {
    client.getMediaFeedByHashtag({ hashtag }).then(list => resolve(list.edge_hashtag_to_media.edges)).catch(reject)
  })
}

function convertToMinutes (millis) {
  var minutes = Math.floor(millis / 60000)
  var seconds = ((millis % 60000) / 1000).toFixed(0)
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds
}

const getCurrentHourMinutes = () => {
  const now = new Date()
  return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
}

function PostReducer (post) {
  return {
    id: post.node.id,
    shortcode: post.node.shortcode
  }
}

function postComment ({ mediaId, hashtag }) {
  const hashTagRelated = (hashtag ? HASHTAG_RELATED_COMMENTS[hashtag] : []) || []
  const pool = [...hashTagRelated, ...COMMENTS]
  const text = pool[Math.ceil(Math.random() * pool.length - 1)]

  client.addComment({ mediaId, text }).then(() => log(`Successfully posted comment: ${text} on media: ${mediaId}`)).catch(err => log(`an error occurred while commenting media: ${mediaId} - ${err.message}`))
}

function follow ({ userId }) {
  client.follow({ userId }).then(() => log(`Successfully followed user: ${userId}`)).catch(err => log(`an error occured following user: ${userId} - ${err.message}`))
}

const Instagram = require('instagram-web-api')
require('dotenv').config()

const username = process.env.IG_USERNAME
const password = process.env.IG_PASSWORD
const HASHTAGS = [
  'mt07',
  'yamaha',
  'yamahamt07',
  'sportsbike',
  'bikesofinstagram',
  'darksideofjapan',
  'supersport',
  'sportbike',
  'motorcycle',
  'rideordie',
  'bikelife',
  'bikesofberlin',
  'bikersofberlin',
  'berlinbikes',
  'berlinbikers'
]

const COMMENTS = [
  'Love your posts bro 😍🔥',
  'Omg wow 🔥🔮',
  'Thats awesome! 🔮🔮',
  'Really enjoying your posts :) 🔮',
  '🔥🔥',
  'Always ride safe man 🔥🔮',
  'Holy Cow 🥺🥺🔥🔥',
  'Amazing Photo 👍👍🔥 Ride Safe!!',
  'Dont forget to check your fluids mate 😂🔥🔥',
  'I would totally ride it 🥺🔥'
]

const HASHTAG_RELATED_COMMENTS = {
  mt07: [
    'Ah yes, the MT-07 🥺🔥',
    'I love this bike 🔮🔥🔥',
    'Beautiful Pics Bro 👍🔥'
  ],
  berlinbikers: [
    'Immer schön deutsche Biker auf Insta zu treffen 🔮🔥🔥'
  ]
}

const client = new Instagram({ username, password })

;(async () => {
  await client.login().then(() => {
    log('successfully logged into Instagram ...')
  }).catch(err => {
    log('error occurred logging into Instagram', err)
  })
  // const profile = await client.getProfile()
  // await likePicturesByHashTag(HASHTAGS[Math.ceil(Math.random() * HASHTAGS.length - 1)], 20000)

  setInterval(async () => {
    console.log(new Date().getMinutes())
    console.log((new Date().getMinutes()) % 15)
    if ((new Date().getMinutes()) === 30 || new Date().getMinutes() === 45) {
      await likePicturesByTimeLine(30000)
      log('Finished liking timeline ...')
    }
    if (new Date().getMinutes() === 0) {
      await likePicturesByHashTag(HASHTAGS[Math.ceil(Math.random() * HASHTAGS.length - 1)], 20000)
    }
  }, 60000)
  // client.logout()
})()

const likePicturesByHashTag = async (hashtag, delay) => {
  const list = await getListByHashtag(client, hashtag)
  const idList = list.map(e => e.node.id).filter(x => x)
  log(`Liking all ${idList.length} pictures of #${hashtag} with interval: ${delay / 1000}s +- ~${delay / 2 / 1000}s maxDelay: ${delay * 2 / 1000}s minDelay:0s`)
  await likePicturesOfIdList({ idList, delay, list, hashtag, followChance: 9, commentChance: 15, maxFollowerGap: 20 })
}

const likePicturesByTimeLine = async (delay) => {
  const list = await client.getHome()
  const idList = list.data.user.edge_web_feed_timeline.edges.map(l => l.node.id)
  log(`Liking all ${idList.length} pictures of the timeline with interval: ${delay / 1000}s +- ~${delay / 2 / 1000}s maxDelay: ${delay * 2 / 1000}s minDelay:0s`)
  await likePicturesOfIdList({ idList, delay, list: list.data.user.edge_web_feed_timeline.edges, logFields: { message: 'Already Liked', field: 'viewer_has_liked' } })
}

const likePicturesOfList = async (list, delay) => {
  let timeStampLast = new Date().getTime()
  list.forEach(delayLoop((entry, index) => {
    const mediaId = entry.node.id

    client.like({ mediaId }).then(() => {
      const timeStampNow = new Date().getTime()
      log(`${getCurrentHourMinutes()} - Successfully liked ${mediaId} of user: ${entry.node.owner.id} after ${convertToMinutes(timeStampNow - timeStampLast)}`)
      timeStampLast = timeStampNow
    }).catch(e => log(mediaId, e.message))
  }, delay))
}

const likePicturesOfIdList = async ({ idList, delay, logFields, list, hashtag, followChance, commentChance, maxFollowerGap }) => {
  const home = await client.getHome()
  const followers = await (await client.getFollowers({ userId: home.data.user.id })).count
  const following = await (await client.getFollowings({ userId: home.data.user.id })).count
  const followerGap = Math.abs(following - followers)

  return new Promise((resolve, reject) => {
    let timeStampLast = new Date().getTime()
    let currentIndex = 0
    idList.forEach(delayLoop(mediaId => {
      const shouldFollow = followChance ? Math.ceil(Math.random() * followChance) === 2 : null
      const shouldComment = commentChance ? Math.ceil(Math.random() * commentChance) === 2 : null

      client.like({ mediaId }).then(() => {
        const timeStampNow = new Date().getTime()
        log(`(${++currentIndex} / ${idList.length}) ${getCurrentHourMinutes()} - Successfully liked ${mediaId} after ${convertToMinutes(timeStampNow - timeStampLast)}s`)
        const userId = list ? list[currentIndex].node.owner.id : null
        if (logFields) {
          // todo LogFields
        }

        if (shouldFollow && userId && followerGap < maxFollowerGap) {
          follow({ userId })
        }

        if (shouldComment) {
          postComment({ mediaId, hashtag })
        }

        if (currentIndex === idList.length) resolve('finished')
        timeStampLast = timeStampNow
      }).catch(e => log(mediaId + ' ' + e.message))
    }, delay))
  })
}

function log (str) {
  console.log(str)
}