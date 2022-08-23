// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Classroom, StudentClassroom, Student, Supply, sequelize} = require('../db/models');
const { Op } = require('sequelize');

const where = {};
// List of classrooms
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    // Phase 2B: Classroom Search Filters
    /*
        name filter:
            If the name query parameter exists, set the name query
                filter to find a similar match to the name query parameter.
            For example, if name query parameter is 'Ms.', then the
                query should match with classrooms whose name includes 'Ms.'
    */
    if (req.query.name){
        let name = {
            [Op.like]: req.query.name
        };

        where.name = name;
    }

    /*  studentLimit filter:
            If the studentLimit query parameter includes a comma
                And if the studentLimit query parameter is two numbers separated
                    by a comma, set the studentLimit query filter to be between
                    the first number (min) and the second number (max)
                But if the studentLimit query parameter is NOT two integers
                    separated by a comma, or if min is greater than max, add an
                    error message of 'Student Limit should be two integers:
                    min,max' to errorResult.errors
            If the studentLimit query parameter has no commas
                And if the studentLimit query parameter is a single integer, set
                    the studentLimit query parameter to equal the number
                But if the studentLimit query parameter is NOT an integer, add
                    an error message of 'Student Limit should be a integer' to
                    errorResult.errors
    */
    if(req.query.studentLimit){
        let studentLimit = req.query.studentLimit.split(',');

        if (studentLimit.length === 1 && typeof Number(studentLimit[0]) === 'number'){
            where.studentLimit = Number(studentLimit[0]);
        }
        else if (studentLimit.length === 2
            && (typeof Number(studentLimit[0]) === 'number')
            && (typeof Number(studentLimit[1]) === 'number')
            && Number(studentLimit[0]) < Number(studentLimit[1])){
                let studentBounds = {
                    [Op.lt]: Number(studentLimit[1]),
                    [Op.gt]: Number(studentLimit[0])
                };
                where.studentLimit = studentBounds;
        }
        else{
            errorResult.errors.push({ message: 'Student Limit should be two numbers: min,max or one integer' });
        }
    }
    // Your code here

    // Phase 2C: Handle invalid params with "Bad Request" response
    if (errorResult.errors.length != 0){
        next({
            name: 'bad-request',
            message: `Error with request for classes`,
            details: errorResult
        });
    }


    const classrooms = await Classroom.findAll({
        attributes: [ 'id', 'name', 'studentLimit' ],
        where: where,
        // Phase 1B: Order the Classroom search results
        order: [['name']]
    });

    res.json(classrooms);
});

// Single classroom
router.get('/:id', async (req, res, next) => {
    let classroom = await Classroom.findByPk(req.params.id, {
        attributes: ['id', 'name', 'studentLimit'],
        // Phase 7:
            // Include classroom supplies and order supplies by category then
            // name (both in ascending order)
            // Include students of the classroom and order students by lastName
            // then firstName (both in ascending order)
            // (Optional): No need to include the StudentClassrooms
        include: [
            {
                model: Supply,
                attributes: ['id', 'name', 'category', 'handed'],
            },
            {   model: Student,
                attributes: ['id', 'firstName', 'lastName', 'leftHanded'],
            }
        ],
        order: [[Supply, 'category'], [Supply, 'name'], [Student, 'lastName'], [Student, 'firstName']]

        // Your code here
    });

    if (!classroom) {
        res.status(404);
        res.send({ message: 'Classroom Not Found' });
    }

    // Phase 5: Supply and Student counts, Overloaded classroom
        // Phase 5B: Find the number of students in the classroom and set it as
            // a property of studentCount on the response
        let resData = classroom.toJSON();

        let countStudent = await Classroom.findOne({
            include: {
                model: Student
            },
            where: {id: req.params.id},
            attributes: [[sequelize.fn('COUNT', sequelize.col('Students.id')), 'studentCount']],
            raw: true
        });
        console.log(countStudent);
        resData.studentCount = countStudent.studentCount;

        // Phase 5C: Calculate if the classroom is overloaded by comparing the
            // studentLimit of the classroom to the number of students in the
            // classroom
        if (resData.studentLimit < resData.studentCount){
            resData.overloaded = true;
        }
        else{
            resData.overloaded = false;
        }
        // Optional Phase 5D: Calculate the average grade of the classroom
        let avgStudent = await Classroom.findOne({
            include: {
                model: StudentClassroom
            },
            where: {id: req.params.id},
            attributes: [[sequelize.fn('AVG', sequelize.col('StudentClassrooms.grade')), 'studentGrade']],
            raw: true
        });
        resData.studentGrade = avgStudent.studentGrade;
    // Your code here

    res.json(resData);
});

// Export class - DO NOT MODIFY
module.exports = router;
