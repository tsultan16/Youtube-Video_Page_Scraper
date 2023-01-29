console.log("Client side code is running...");

let button = document.getElementById('submit');
button.addEventListener('click', submitURL);

function submitURL () {
    let videoURL_input = document.getElementById('url');
    let checkbox_publishDate = document.getElementById('publishDate');
    let checkbox_description = document.getElementById('description');
    let checkbox_comments = document.getElementById('comments');
    
    console.log(`Video URL: ${videoURL_input.value}`);
    console.log(`Publish Date checkbox: ${checkbox_publishDate.checked}`);
    console.log(`Description checkbox: ${checkbox_description.checked}`);
    console.log(`Comments checkbox: ${checkbox_comments.checked}`);

    let videoURL = videoURL_input.value;
    publishDate = checkbox_publishDate.checked;
    description = checkbox_description.checked;
    comments = checkbox_comments.checked;

    videoURL_input.value = "";
    checkbox_publishDate.checked = false;
    checkbox_description.checked = false;
    checkbox_comments.checked = false;

    let message = document.createElement('h4');
    message.innerText = "\nScraping in progress...\n";
    document.querySelector('.col2').appendChild(message);

    // submit post request to server
    const url = '/scrape';
    const options = {
        method: 'POST',
        body: JSON.stringify({"url" : videoURL, "publishDate" : publishDate, "description" : description, "comments" : comments}),
        headers: {'Content-Type' : 'application/json; charset=UTF-8'}
    }
    
    fetch(url, options)
    .then( (res) => {
        if(res.status != 201) {
            throw new Error(`Post request to server failed with status code ${res.status}`);
        }
        console.log(`Response status code: ${res.status}`);
        return res.json();

    })
    .then( (res_data) => {
        console.log("Server response:\n")
        console.log(res_data);

        //res_data.authentication
        //let message = document.getElementsByClassName("message").item(0);
        
        // output the scrapped data to third column of the main section
        document.querySelector('.col2').lastChild.remove();
        let data_section = document.getElementById('scrapped_data');
        
        let vidTitle = document.createElement('h4');
        vidTitle.innerText = res_data.title;
        data_section.appendChild(vidTitle);

        if(publishDate){
            let vidPublishDate = document.createElement('p');
            vidPublishDate.innerText = "Publish Date: " + res_data.publishDate;
            data_section.appendChild(vidPublishDate);    
        }
        
        if (description) {
            let vidDescription = document.createElement('p');
            vidDescription.innerText = "Video Description:\n" + res_data.description;
            data_section.appendChild(vidDescription);    
        }
        
        if (comments) {
            let vidComment = document.createElement('h6');
            vidComment.innerText = "Comments:";
            data_section.appendChild(vidComment);
    
            for(comment of res_data.comments){
                let vidComment = document.createElement('p');
                vidComment.innerText = "\nAuthor: " + comment.author + ", commented when: " + comment.commentedWhen + "\n" + comment.comment;
                data_section.appendChild(vidComment);
            }        
        }
   
    })
    .catch( (err) => {
        console.error(err);
    });




}
