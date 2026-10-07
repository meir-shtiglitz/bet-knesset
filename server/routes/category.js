const express = require('express')
const router = express.Router();
const {isLoged, isAdmin} = require('../middlewears/user');
const slugify = require("slugify")

// router.post('/category/add', requireSignin, isAdmin, create)
router.post('/category/add',isLoged, isAdmin, async (req, res) => {
    try { 
        const {name} = req.body;
        const category = await new Category({name, slug: slugify(name)}).save();
        res.json(category)
    } catch (error) {
        res.status(400).send("Create category failed")
    }
})
router.get('/category/list', async(req, res) => {
   const categories = await Category.find({});
   res.send({categories});
})
// router.get('/category/:slug', read)
router.put('/category/update/:slug', isLoged, isAdmin, (req, res)=> {
    Category.findOne({slug: req.params.slug}, (err, cat) => {
        cat.name = req.body.name;
        cat.slug = slugify(req.body.name)
        cat.save();
        return res.status(200).send('done');
    })
})

router.delete('/category/delete/:slug', isLoged, isAdmin, (req, res) => {
    Category.deleteOne({slug: req.params.slug}).exec((response) => {
        res.status(200).send('done');
    });
})



module.exports = router;