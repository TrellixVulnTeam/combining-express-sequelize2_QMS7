// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Student } = require('../db/models');
const { Op } = require("sequelize");

// List
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    // Phase 2A: Use query params for page & size
    // Your code here
    let page = ((typeof Number(req.query.page) != 'number') || !req.query.page) ? 1 : parseInt(req.query.page);
    let size = ((typeof Number(req.query.size) != 'number') || !req.query.size) ? 10 : parseInt(req.query.size);

    // Phase 2B: Calculate limit and offset
    // Phase 2B (optional): Special case to return all students (page=0, size=0)
    // Phase 2B: Add an error message to errorResult.errors of
        // 'Requires valid page and size params' when page or size is invalid
    // Your code here
    let limit;
    let offset;

    if ((size < 1 && size != 0)
        || size > 200
        || (page < 1 && page != 0)){
        errorResult.errors.push({ message: 'Requires valid page and size params' });
    }
    else if (size === 0 || page === 0){
        page = 1;
    }
    else if(size >= 1 && page >= 1){
        limit = size;
        offset = size * (page - 1);
    }

    const where = {};

    // Phase 4: Student Search Filters
    /*
        firstName filter:
            If the firstName query parameter exists, set the firstName query
                filter to find a similar match to the firstName query parameter.
            For example, if firstName query parameter is 'C', then the
                query should match with students whose firstName is 'Cam' or
                'Royce'.
    */
    // Your code here
    if (req.query.firstName){
        let firstName = {
            [Op.like]: req.query.firstName
        };

        where.firstName = firstName;
    }
    /*    lastName filter: (similar to firstName)
            If the lastName query parameter exists, set the lastName query
                filter to find a similar match to the lastName query parameter.
            For example, if lastName query parameter is 'Al', then the
                query should match with students whose lastName has 'Alfonsi' or
                'Palazzo'.
    */
    if (req.query.lastName){
        let lastName = {
            [Op.like]: req.query.lastName
        };

        where.lastName = lastName;
    }
    /*    lefty filter:
            If the lefty query parameter is a string of 'true' or 'false', set
                the leftHanded query filter to a boolean of true or false
            If the lefty query parameter is neither of those, add an error
                message of 'Lefty should be either true or false' to
                errorResult.errors
    */
    if (req.query.leftHanded === 'true'){
        where.leftHanded = true;
    }
    else if(req.query.leftHanded === 'false'){
        where.leftHanded = false;
    }
    else if (req.query.leftHanded){
        errorResult.errors.push({ message: 'Lefty should be either true or false' });
    }

    // Phase 3C: Include total student count in the response even if params were
    // invalid
    /*
        If there are elements in the errorResult.errors array, then
        return a "Bad Request" response with the errorResult as the body
        of the response.

        Ex:
            errorResult = {
                errors: [{ message: 'Grade should be a number' }],
                count: 267,
                pageCount: 0
            }
    */
    // Your code here

    errorResult.count = await Student.count({
        where: where
    });

    // Phase 2C: Handle invalid params with "Bad Request" response
    if (errorResult.errors.length != 0){
        next({
            name: 'bad-request',
            message: `Error with request for students`,
            details: errorResult
        });
    }


    let result = {};

    // Phase 3A: Include total number of results returned from the query without
        // limits and offsets as a property of count on the result
        // Note: This should be a new query
    result.count = errorResult.count

    result.rows = await Student.findAll({
        attributes: ['id', 'firstName', 'lastName', 'leftHanded'],
        where: where,
        // Phase 1A: Order the Students search results
        order: [['lastName'], ['firstName']],
        // Phase 2D: Add limit and offset to the query
        limit: limit,
        offset: offset
    });

    // Phase 2E: Include the page number as a key of page in the response data
        // In the special case (page=0, size=0) that returns all students, set
            // page to 1
        /*
            Response should be formatted to look like this:
            {
                rows: [{ id... }] // query results,
                page: 1
            }
        */
    result.page = page;
    // Your code here

    // Phase 3B:
        // Include the total number of available pages for this query as a key
            // of pageCount in the response data
        // In the special case (page=0, size=0) that returns all students, set
            // pageCount to 1
        /*
            Response should be formatted to look like this:
            {
                count: 17 // total number of query results without pagination
                rows: [{ id... }] // query results,
                page: 2, // current page of this query
                pageCount: 10 // total number of available pages for this query
            }
        */
    // Your code here
    if (!limit || (!offset && offset != 0)){
        result.pageCount = 1;
    }
    else{
        result.pageCount = Math.ceil(result.count / limit);
    }

    res.json(result);
});

// Export class - DO NOT MODIFY
module.exports = router;
