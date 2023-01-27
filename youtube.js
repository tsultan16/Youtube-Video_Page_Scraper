const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeYoutubeVideo() {

    // launch the browser
    const browser = await puppeteer.launch({headless: true, ignoreHTTPSErrors: true});
    // open a new page
    const page = await browser.newPage();
    // set the page size
    await page.setViewport({ width: 1280, height: 800 });

    // navigate to website link
    const youtube_video_url = 'https://www.youtube.com/watch?v=8aGhZQkoFbQ&t=257s&ab_channel=JSConf';
    // 'https://www.youtube.com/watch?v=8TMuAVK2WBQ&t=1030s&ab_channel=PatrickLenk';
     console.log(`Navigating to ${youtube_video_url}...`);
    await page.goto(youtube_video_url, {waitUntil: 'domcontentloaded'});
  
    // get the video title
    await page.waitForSelector('#title h1', {visible: true}); //('#title h1', {timeout : 30_000})
    let title = await page.$eval('#title h1', el =>  el.innerText);
    console.log(`Video Title: ${title}`);

    // get the video description metadata
    await page.waitForSelector('tp-yt-paper-button#expand', {visible: true});
    await page.click('tp-yt-paper-button#expand');
    
    // get video publish date
    await page.waitForSelector('#description-inner #info-container #info', {visible: true});
    let publishDate = await page.$eval('#description-inner #info-container #info', el => {
        return el.lastChild.innerText;         
    }); 
    console.log(`Video Publish Date: ${publishDate}`);

    await page.waitForSelector('#description-inner ytd-text-inline-expander yt-formatted-string span', {visible: true})
    let description = await page.$eval('#description-inner ytd-text-inline-expander yt-formatted-string span', el => el.innerText);
    console.log(`Video Description:\n${description}`);
    //sleep(5000); // wait for 5 seconds
    
    // scroll down the page a couple of times
    let scrollCount = 0
    scrollCount = await scrollPage(page, 5, scrollCount, 2000);

    // get the total number of comments
    await page.waitForSelector('ytd-comments-header-renderer #title #count .count-text', {visible: true})
    let totalComments = await page.$eval('ytd-comments-header-renderer #title #count .count-text', el => {
      return el.firstChild.innerText; 
    });
    totalComments = totalComments.replace(",","");  
    console.log(`Total Number of Comments: ${totalComments}`);

    // scroll down the page some more
    scrollCount = await scrollPage(page, 10, scrollCount, 2000);
 
    // get some comments
    console.log("Scraping all the comments...");
    let comments = await scrapeComments(page);
    console.log(`Number of comments found: ${comments.length}`);
    // console.log(comments);
    sleep(2000); // wait for 2 seconds 

    // if we haven't gotten all the comments yet, then scroll some more and get the remaining comments
    // NOTE: Banned/hidden youtube comments usually contribute to the total comments count, but they
    // don't show up, so the total count is almost always an overstimate of how many actual comments are in view 
    let commentsFound = comments.length-1; // decreased by one to allow the loop to run
    //console.log(comments.length, totalComments, commentsFound, comments.length);
    //console.log((comments.length < totalComments) && (commentsFound < comments.length));
    while (comments.length < totalComments) {
      
      // estimate how much we need to scroll to get all the comments
      let needToScroll = Math.ceil((totalComments - comments.length) / totalComments) * scrollCount;   
      console.log('Re-Scraping all the comments...');
      console.log(`Estimated number of scrolls: ${needToScroll}`);

      // scroll only a small bit first to make sure that we're not at the end of the page
      scrollCount = await scrollPage(page, 0.1 * needToScroll, scrollCount, 2000);
      comments = await scrapeComments(page);
      console.log(`Number of comments found: ${comments.length}`);
      if(comments.length === commentsFound) {
        console.log("We've reached the end of the comments section!");
        break;
      }

      scrollCount = await scrollPage(page, needToScroll, scrollCount, 2000);
      comments = await scrapeComments(page);
      commentsFound = comments.length;
      console.log(`Number of comments found: ${comments.length}`);
      sleep(2000); // wait for 2 seconds 
    }
    console.log("Comment scraping completed.");

    sleep(10000); // wait 10 seconds
    console.log(`Now scrolling back up..`);
    // scroll back to the top
    scrollCount = await scrollPage(page, -scrollCount, scrollCount, 0);
    sleep(2000); 

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
      else {
        console.log("Video data succesfully written to file.");
      }
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

// this function scrolls the page 'n' times (n>0 for down, n<0 for up), delay between scrolls in ms
async function scrollPage(page, n, count, delay) {
  if(n === 0) return count;
  console.log(`Scrolling the page ${n} times..`);
  let sign = n / Math.abs(n);

  for(let i = 0; i < Math.abs(n); i++) {
    await page.evaluate(sign => {
      window.scrollBy(0, sign*window.innerHeight);
    }, sign);
    console.log(`Scroll# ${i}`);
    clearLastLine();
    sleep(delay); // wait 
  }  
  console.log(`Scroll count = ${count+n}`);
  return Math.floor(count += n);
}

// this function will scrape all the comments loaded within the current view window
async function scrapeComments(page) {

  await page.waitForSelector('#comments #sections #contents', {visible: true});
  //get all the comments
  let comments = await page.$$eval('#comments #sections #contents ytd-comment-renderer', links => {
    links = links.map(el => {
        let author = el.querySelector('#body #main #header #header-author h3').innerText;
        let commentedWhen = el.querySelector('#body #main #header #header-author .published-time-text a').innerText;
        let comment = el.querySelector('#body #main #comment-content #expander #content #content-text').innerText;     
        return {"author" : author, "commentedWhen": commentedWhen, "comment" : comment};
    }); 
    return links;
  });  
  return comments; 

}


const clearLastLine = () => {
  process.stdout.moveCursor(0, -1) // up one line
  process.stdout.clearLine(1) // from cursor to end
}
