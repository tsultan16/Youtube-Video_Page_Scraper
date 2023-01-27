const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeYoutubeVideo() {

    // launch the browser (turn off headless)
    const browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true});
    // open a new page
    const page = await browser.newPage();
    // set the page size
    await page.setViewport({ width: 1280, height: 800 });

    // navigate to website link
    const youtube_video_url = 'https://www.youtube.com/watch?v=A7cupDNfccU&ab_channel=TomislavPeharec';
    //'https://www.youtube.com/watch?v=BaNIlk2J_eI&list=PLUlRJwReoFrK0pvPoElzl3-Nt9twS2xHQ&index=128&ab_channel=ComedyCentral';
 
    // navitage to the page
    console.log(`Navigating to ${youtube_video_url}...`);
    // const navigationPromise = page.waitForNavigation();
    // await navigationPromise;
    await page.goto(youtube_video_url, {waitUntil: 'domcontentloaded'});

    // get the video title
    await page.waitForSelector('#title h1', {visible: true}); //('#title h1', {timeout : 30_000})
    let title = await page.$eval('#title h1', el =>  el.innerText);
    console.log(`Video Title: ${title}`);
    //sleep(5000); // wait for 5 seconds

    // get the video description metadata
    await page.waitForSelector('tp-yt-paper-button#expand', {visible: true});
    await page.click('tp-yt-paper-button#expand');
    //sleep(5000); // wait for 5 seconds
    
    // get video publish date
    await page.waitForSelector('#description-inner #info-container #info', {visible: true});
    let publishDate = await page.$eval('#description-inner #info-container #info', el => {
        return el.lastChild.innerText;         
    }); 
    console.log(`Video Publish Date: ${publishDate}`);

    await page.waitForSelector('#description-inner ytd-text-inline-expander yt-formatted-string span', {visible: true})
    let description = await page.$eval('#description-inner ytd-text-inline-expander yt-formatted-string span', el => el.innerText);
    console.log(`Video Description:\n${description}`);
    sleep(5000); // wait for 5 seconds
    
    // scroll down the page a couple of times
    await scrollDown(page, 6);

    // for(let i = 0; i < 7; i++) {
    //   await page.evaluate(() => {
    //     window.scrollBy(0, window.innerHeight);
    //   });
    //   sleep(2000); // wait for 2 seconds  
    // }

    // get the total number of comments
    await page.waitForSelector('ytd-comments-header-renderer #title #count .count-text', {visible: true})
    let totalComments = await page.$eval('ytd-comments-header-renderer #title #count .count-text', el => {
      return el.firstChild.innerText; });
    console.log(`Total Number of Comments: ${totalComments}`);

     // scroll down the page some more
     await scrollDown(page, 25);

     console.log("Scrolling down the page..");
     for(let i = 0; i < 25; i++) {
       await page.evaluate(() => {
         window.scrollBy(0, window.innerHeight);
       });
       sleep(2000); // wait for 2 seconds  
     }
 
    // get all the comments
    console.log("Scraping all the comments...");
    let comments = await scrapeComments(page);
    console.log(`Number of comments found: ${comments.length}`);
    // console.log(comments);
    sleep(2000); // wait for 5 seconds 

    console.log(`Now scrolling back up..`);
    // scroll back to the top
    await page.evaluate(() => {
      window.scrollBy(0, -15*window.innerHeight);
    });
    sleep(5000); 

    // close the page
    await page.close();
    //close the browser
    await browser.close();

    // save video data in file
    filename = title + ".JSON"
    let videoData = {};
    videoData['title'] = title;
    videoData['publishDate'] = publishDate;
    videoData['description'] = description;
    videoData['comments'] = comments;
    
    fs.writeFile(filename, JSON.stringify(videoData), err => {
      if(err) {
        console.error(`Failed to write data to file => ${err}`);
      }
      console.log("Video data succesfully written to file.")
    })

    console.log('Done!')
}

scrapeYoutubeVideo();

// a basic sleep function
function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

// this function scrolls down the page 'n' times
async function scrollDown(page, n) {
  console.log("Scrolling down the page..");
  for(let i = 0; i < n; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    sleep(2000); // wait for 2 seconds  
  }  
}

// this function will scrape all the comments loaded within the current view window
async function scrapeComments(page) {

  await page.waitForSelector('#comments #sections #contents', {visible: true});
  //get all the comments
  let comments = await page.$$eval('#comments #sections #contents ytd-comment-renderer', links => {
    links = links.map(el => {
        let author = el.querySelector('#body #main #header #header-author h3').innerText;
        let comment = el.querySelector('#body #main #comment-content #expander #content #content-text').innerText;     
        return {"author" : author, "comment" : comment};
    }); 
    return links;
  });  
  return comments; 

}