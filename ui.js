$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $createStoryForm = $("#create-story-form");
  const $createStoryNav = $("#create-story-nav");
  const $storyTitle = $("#story-title");
  const $storyAuthor = $("#story-author");
  const $storyUrl = $("#story-url");


  // const $

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */
  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    await generateStories(); 
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */
  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */
  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */


  $('body').on("click", ".fa-edit", function (e) {
    // Show the Login and Create Account Forms
    e.preventDefault();
    $(this).parent().parent().children('.edit-form').slideToggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */
  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */
  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    regenerateStories(storyList);
    await addRemoveFavorites();
    await addDeleteStoryListener();

  }

  // run requested user.stories for first and after adding stories
  function regenerateStories(storyList) {
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }


  // add/remove story from favorite list when filled star .fas or empty star .far is toggled
  async function addRemoveFavorites() {
    $(".fa-star").on("click", async function () {
      $(this).toggleClass("far fas");
      let storyId = $(this).parent().attr("id");

      //add favorite
      if ($(this).hasClass("fas")) {
        await currentUser.favoriteStory(storyId, currentUser, "post");
      }
      //remove favorite
      else if ($(this).hasClass("far")) {
        await currentUser.favoriteStory(storyId, currentUser, "delete");
      }
    })
  }
  /**
   * 
   */
  // TODO - delete story when fa-trash clicked, correct user required
  async function addDeleteStoryListener() {
    $(".fa-trash").on("click", async function() {
      let storyId = $(this).parent().parent().attr("id");
      await storyList.deleteStory(currentUser, storyId);
      $(`#${storyId}`).remove();
    })
  }


  /**
   * A function to render HTML for an individual Story instance
   */
  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    
    // will check favorites only if user is logged in
    let isFavorite = -1;

    if(currentUser !== null) {
      isFavorite = currentUser.favorites.findIndex(obj => {
        return obj.storyId === story.storyId;
      })
    }

        // will add trash can only if it exist in own story
        // will edit story only if it user's own story
        let editMarkup = "";
        let trashMarkup = "";
        if(currentUser !== null) {
          let ind = currentUser.ownStories.findIndex((obj) => {
            return obj.storyId === story.storyId;
          })
          if(ind !== -1) {
            trashMarkup = '<i class="fa fa-trash ml-2" aria-hidden="true"></i>'
            editMarkup = '<i class="far fa-edit ml-2" aria-hidden="true"></i>'
          }
      }

    // will show favorites and trash buttons only if logged in
    let favoriteMarkup = "";

    if(currentUser !== null) {
      favoriteMarkup = `<i class="text-warning mr-1 ${isFavorite > -1 ? "fas" : "far"} fa-star"></i>`
    }


    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}" class="card mb-3">
        <div class="card-header">
        ${favoriteMarkup}
          <a class="article-link" href="${story.url}" target="a_blank">
            <strong>${story.title}</strong>
          </a>
          ${editMarkup}
        </div>
        <!--------------------- EDIT STORY FORM  ----------------------->
        <form action="" class="hidden edit-form">
          <div>
            <label for="author">author</label>
            <input id="edit-author" required type="text" placeholder="author name">
          </div>
          <div>
            <label for="title">title</label>
            <input id="edit-title" required type="text" placeholder="article title">
          </div>
          <div>
            <label for="url">url</label>
            <input id="edit-url" required type="url" placeholder="article url">
          </div>
          <button type="submit">submit</button>
          <hr>
        </form>
        <div class="card-body">
      
          <small class="article-author">by ${story.author}</small>
          <small class="article-hostname ${hostName}">(${hostName})</small>
          ${trashMarkup}
          <small class="article-username">posted by ${story.username}</small>
        </div>
      </li>
    `);

    return storyMarkup;
  }

  // hide all elements in elementsArr
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $createStoryNav.show();
    console.log(currentUser);
  }

  // create story event listener 
  $createStoryNav.on('click', function () {
    $createStoryForm.slideToggle();
  })

  // add new story
  $createStoryForm.on('submit', async function (e) {
    e.preventDefault();
    let title = $storyTitle.val();
    let author = $storyAuthor.val();
    let url = $storyUrl.val();
    const storyObj = {
      story: {
        title,
        author,
        url
      }
    }
    $allStoriesList.empty();
    await storyList.addStory(currentUser, storyObj);
    regenerateStories(storyList);
  })

  // simple function to pull the hostname from a URL
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }




  // sync current user information to localStorage
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
