var express = require('express');
var router = express.Router();
var database = require('../database');

/* GET home page. */

const requireAuth = (req, res, next) => {
    if (req.session.user_id) {
        next(); 
    } else {
        res.redirect('/'); 
    }
};

router.get('/home', requireAuth, (req, res) => {
    const sql = 'SELECT * FROM Blogs ORDER BY Timestamp DESC'; 
    database.query(sql, (error, blogPosts) => {
        if (error) {
            console.error('Error fetching blog posts:', error);
            return res.status(500).send('Internal Server Error');
        }

        res.render('home', { title: 'Express', session: req.session, blogPosts });
    });
});

router.post('/signup', (req, res) => {
    const { user_email_address, user_password, confirm_password } = req.body;

    if (user_password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    const insertQuery = 'INSERT INTO user_login (user_email, user_password) VALUES (?, ?)';
    database.query(insertQuery, [user_email_address, user_password], (err, result) => {
        if (err) {
            console.error('Error inserting user data: ' + err.message);
            return res.status(500).send('Internal Server Error');
        }

        // Redirect to the login page after successful signup
        res.redirect('/');
    });
});

router.get('/', function(req, res, next) {
    if (req.session.user_id) {
        res.render('home', { title: 'Express', session: req.session });
    } else {
        res.render('index', { title: 'Express', session: req.session });
    }
});



router.post('/submit_post', (req, res) => {
    if (!req.session) {
      console.error('Session not initialized!');
      return res.status(500).send('Internal Server Error');
    }
  
    const { user_id } = req.session;
    const { 'post-title': title, 'post-content': content } = req.body;
  
    if (!title || !content || !user_id) {
      return res.status(400).send('Invalid blog post data');
    }
  
    const sql = 'INSERT INTO Blogs (Title, Content, Author) VALUES (?, ?, ?)';
    const values = [title, content, user_id];
  
    database.query(sql, values, (error, results) => {
      if (error) {
        console.error('Error inserting blog post:', error);
        return res.status(500).send('Internal Server Error');
      }
  
      console.log('Blog post inserted successfully:', results);
      res.redirect('/home');
    });
  });
  
  router.get('/signup', (req, res) => {
    res.render('signup'); 
});

router.get('/post-details/:id', async (req, res) => {
    const postId = req.params.id;

    // Fetch post details
    const postQuery = 'SELECT * FROM Blogs WHERE BlogID = ?';
    database.query(postQuery, [postId], (postError, postResults) => {
        if (postError) {
            console.error('Error fetching post details:', postError.message);
            return res.status(500).send('Internal Server Error');
        }

        if (postResults.length === 0) {
            return res.status(404).send('Post not found');
        }

        const postDetails = postResults[0];

        // Fetch comments for the post
        const commentsQuery = 'SELECT * FROM comments WHERE post_id = ?';
        database.query(commentsQuery, [postId], (commentsError, commentsResults) => {
            if (commentsError) {
                console.error('Error fetching comments:', commentsError.message);
                return res.status(500).send('Internal Server Error');
            }

            const comments = commentsResults;

            // Render the post-details page with post details and comments
            res.render('post-details', { postDetails, comments });
        });
    });
});




router.post('/login', function(request, response, next) {
    if (!request.session) {
        console.error("Session not initialized!");
        return response.status(500).send("Internal Server Error");
    }

    var user_email_address = request.body.user_email_address;
    var user_password = request.body.user_password;

    if (user_email_address && user_password) {
        query = `
            SELECT * FROM user_login 
            WHERE user_email = "${user_email_address}"
        `;

        database.query(query, function(error, data) {
            if (data.length > 0) {
                for (var count = 0; count < data.length; count++) {
                    if (data[count].user_password == user_password) {
                        request.session.user_id = data[count].user_id;
                        response.redirect('/home');
                    } else {
                        response.send('Incorrect Password');
                    }
                }
            } else {
                response.send('Incorrect Email Address');
            }
            response.end();
        });
    } else {
        response.send('Please Enter Email Address and Password Details');
        response.end();
    }
});

router.get('/logout', function(request, response, next) {
    request.session.destroy();
    response.redirect("/");
});

module.exports = router;


router.post('/add-comment', (req, res) => {
    const { postId, username, message } = req.body;
    console.log('Received values:', postId, username, message);
    if (!postId || !username || !message) {
        return res.status(400).send('Invalid comment data');
    }

    const insertQuery = 'INSERT INTO comments (post_id, username, message) VALUES (?, ?, ?)';
    database.query(insertQuery, [postId, username, message], (err, result) => {
        if (err) {
            console.error('Error inserting comment into the database: ' + err.message);
            return res.status(500).send('Internal Server Error');
        }

        res.redirect(`/post-details/${postId}`);
    });
});

router.post('/like', async (req, res) => {
    const postId = req.body.postId;

    // Update the database to add a like
    const updateQuery = 'INSERT INTO post_likes (post_id) VALUES (?)';
    database.query(updateQuery, [postId], async (err, result) => {
        if (err) {
            console.error('Error updating like:', err.message);
            return res.status(500).send('Internal Server Error');
        }

        // Fetch the updated like count
        const likeCountQuery = 'SELECT COUNT(id) AS LikeCount FROM post_likes WHERE post_id = ?';
        database.query(likeCountQuery, [postId], (err, result) => {
            if (err) {
                console.error('Error fetching like count:', err.message);
                return res.status(500).send('Internal Server Error');
            }

            const likeCount = result[0].LikeCount || 0;

            // Redirect back to the post details page or home page
            res.redirect('/home');  // Update this redirect based on your application flow
        });
    });
});
