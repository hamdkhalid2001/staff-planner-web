export const exampleTaskTypeTaskData = [
    {
        id: 7,
        title: 'Software validation, research and implementation',
        orderId: 0,
        isExpanded: false,
        children: [
            {
                id: 12,
                title: 'Design',
                orderId: 2,
                start: new Date('2014-06-02T00:00:00.000Z'),
                end: new Date('2014-06-02T00:00:00.000Z'),
                percentComplete: 1,
                isExpanded: false
                // 'type': 'milestone'
            },
            {
                id: 13,
                title: 'Implementation',
                orderId: 3,
                start: new Date('2014-06-02T00:00:00.000Z'),
                end: new Date('2014-06-03T00:10:00.000Z'),
                percentComplete: 0.77,
                isExpanded: false
                // 'type': 'regular'
            }
        ]
    }
];

export const exampleDependencyTypeTaskData = [
    {
        id: 1,
        title: 'FF - start',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 0.77
    },
    {
        id: 2,
        title: 'FF - end',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 0.64
    },
    {
        id: 5,
        title: 'FS - start',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 1
    },
    {
        id: 6,
        title: 'FS - end',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 0.8
    },
    {
        id: 13,
        title: 'SS - start',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 0.25
    },
    {
        id: 14,
        title: 'SS - end',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 0.25
    },
    {
        id: 9,
        title: 'SF - start',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 0.1
    },
    {
        id: 10,
        title: 'SF - end',
        start: new Date('2014-06-01T00:00:00.000Z'),
        end: new Date('2014-06-02T10:00:00.000Z'),
        percentComplete: 0
    }
];

export const exampleDependencyTypeDependencyData = [
    {
        id: 1,
        fromId: 1,
        toId: 2,
        type: 0
    },
    {
        id: 3,
        fromId: 5,
        toId: 6,
        type: 1
    },
    {
        id: 5,
        fromId: 9,
        toId: 10,
        type: 2
    },
    {
        id: 7,
        fromId: 13,
        toId: 14,
        type: 3
    }
];

export const exampleFlatTaskData = [
    {
        id: 7,
        title: 'Software validation, research and implementation',
        orderId: 0,
        start: new Date('2014-06-02T00:00:00.000Z'),
        end: new Date('2014-07-12T00:00:00.000Z'),
        percentComplete: 0.45708333333333334,
        isExpanded: false,
        reportsTo: null
    },
    {
        id: 11,
        title: 'Research',
        orderId: 1,
        start: new Date('2014-06-02T00:00:00.000Z'),
        end: new Date('2014-06-07T00:00:00.000Z'),
        percentComplete: 0.5766666666666667,
        isExpanded: false,
        reportsTo: 7
    },
    {
        id: 19,
        title: 'Validation with Customers',
        orderId: 0,
        start: new Date('2014-06-02T00:00:00.000Z'),
        end: new Date('2014-06-04T00:00:00.000Z'),
        percentComplete: 0.25,
        isExpanded: false,
        reportsTo: 11
    },
    {
        id: 20,
        title: 'Market Research',
        orderId: 1,
        start: new Date('2014-06-02T00:00:00.000Z'),
        end: new Date('2014-06-03T02:00:00.000Z'),
        percentComplete: 0.82,
        isExpanded: false,
        reportsTo: 11
    },
    {
        id: 39,
        title: 'Functional and Technical Specification',
        orderId: 2,
        start: new Date('2014-06-04T00:00:00.000Z'),
        end: new Date('2014-06-07T00:00:00.000Z'),
        percentComplete: 0.66,
        isExpanded: false,
        reportsTo: 11
    },
    {
        id: 12,
        title: 'Design',
        orderId: 2,
        start: new Date('2014-06-09T00:00:00.000Z'),
        end: new Date('2014-06-14T00:00:00.000Z'),
        percentComplete: 0.6,
        isExpanded: false,
        reportsTo: 7
    },
    {
        id: 22,
        title: 'UI Design',
        orderId: 0,
        start: new Date('2014-06-09T00:00:00.000Z'),
        end: new Date('2014-06-11T00:00:00.000Z'),
        percentComplete: 0.56,
        isExpanded: false,
        reportsTo: 12
    },
    {
        id: 23,
        title: 'HTML Prototype',
        orderId: 1,
        start: new Date('2014-06-11T00:00:00.000Z'),
        end: new Date('2014-06-14T00:00:00.000Z'),
        percentComplete: 0.64,
        isExpanded: false,
        reportsTo: 12
    }
];

export const exampleTaskData = [
    {
        id: 7,
        title: 'Software validation, research and implementation',
        orderId: 0,
        parentId: null,
        start: new Date('2014-06-02T00:00:00.000Z'),
        end: new Date('2014-07-12T00:00:00.000Z'),
        percentComplete: 0.45708333333333334,
        isExpanded: false,
        children: [
            {
                id: 11,
                title: 'Research',
                orderId: 1,
                parentId: 7,
                start: new Date('2014-06-02T00:00:00.000Z'),
                end: new Date('2014-06-07T00:00:00.000Z'),
                percentComplete: 0.5766666666666667,
                isExpanded: false,
                children: [
                    {
                        id: 19,
                        title: 'Validation with Customers',
                        orderId: 0,
                        parentId: 11,
                        start: new Date('2014-06-02T00:00:00.000Z'),
                        end: new Date('2014-06-04T00:00:00.000Z'),
                        percentComplete: 0.25,
                        isExpanded: false
                    },
                    {
                        id: 20,
                        title: 'Market Research',
                        orderId: 1,
                        parentId: 11,
                        start: new Date('2014-06-02T00:00:00.000Z'),
                        end: new Date('2014-06-02T02:00:00.000Z'),
                        percentComplete: 0.82,
                        isExpanded: false
                    },
                    {
                        id: 39,
                        title: 'Functional and Technical Specification',
                        orderId: 2,
                        parentId: 11,
                        start: new Date('2014-06-04T00:00:00.000Z'),
                        end: new Date('2014-06-07T00:00:00.000Z'),
                        percentComplete: 0.66,
                        isExpanded: false
                    }
                ]
            },
            {
                id: 12,
                title: 'Design',
                orderId: 2,
                parentId: 7,
                start: new Date('2014-06-09T00:00:00.000Z'),
                end: new Date('2014-06-14T00:00:00.000Z'),
                percentComplete: 0.6,
                isExpanded: false,
                children: [
                    {
                        id: 22,
                        title: 'UI Design',
                        orderId: 0,
                        parentId: 12,
                        start: new Date('2014-06-09T00:00:00.000Z'),
                        end: new Date('2014-06-11T00:00:00.000Z'),
                        percentComplete: 0.56,
                        isExpanded: false
                    },
                    {
                        id: 23,
                        title: 'HTML Prototype',
                        orderId: 1,
                        parentId: 12,
                        start: new Date('2014-06-11T00:00:00.000Z'),
                        end: new Date('2014-06-14T00:00:00.000Z'),
                        percentComplete: 0.64,
                        isExpanded: false
                    }
                ]
            },
            {
                id: 13,
                title: 'Implementation',
                orderId: 3,
                parentId: 7,
                start: new Date('2014-06-11T00:00:00.000Z'),
                end: new Date('2014-07-02T00:00:00.000Z'),
                percentComplete: 0.77,
                isExpanded: false,
                children: [
                    {
                        id: 24,
                        title: 'Prototype',
                        orderId: 0,
                        parentId: 13,
                        start: new Date('2014-06-11T00:00:00.000Z'),
                        end: new Date('2014-06-17T00:00:00.000Z'),
                        percentComplete: 0.77,
                        isExpanded: false
                    },
                    {
                        id: 26,
                        title: 'Architecture',
                        orderId: 1,
                        parentId: 13,
                        start: new Date('2014-06-17T00:00:00.000Z'),
                        end: new Date('2014-06-18T00:00:00.000Z'),
                        percentComplete: 0.82,
                        isExpanded: false
                    },
                    {
                        id: 27,
                        title: 'Data Layer',
                        orderId: 2,
                        parentId: 13,
                        start: new Date('2014-06-18T00:00:00.000Z'),
                        end: new Date('2014-06-24T00:00:00.000Z'),
                        percentComplete: 0.5,
                        isExpanded: false
                    },
                    {
                        id: 28,
                        title: 'Unit Tests',
                        orderId: 4,
                        parentId: 13,
                        start: new Date('2014-06-18T00:00:00.000Z'),
                        end: new Date('2014-06-27T00:00:00.000Z'),
                        percentComplete: 0.68,
                        isExpanded: false
                    },
                    {
                        id: 29,
                        title: 'UI and Interaction',
                        orderId: 3,
                        parentId: 13,
                        start: new Date('2014-06-27T00:00:00.000Z'),
                        end: new Date('2014-07-02T00:00:00.000Z'),
                        percentComplete: 0.6,
                        isExpanded: false
                    }
                ]
            },
            {
                id: 14,
                title: 'Testing',
                orderId: 4,
                parentId: 7,
                start: new Date('2014-06-30T00:00:00.000Z'),
                end: new Date('2014-07-05T00:00:00.000Z'),
                percentComplete: 0.52,
                isExpanded: false,
                children: [
                    {
                        id: 32,
                        title: 'Integration Testing',
                        orderId: 0,
                        parentId: 14,
                        start: new Date('2014-06-30T00:00:00.000Z'),
                        end: new Date('2014-07-05T00:00:00.000Z'),
                        percentComplete: 0.94,
                        isExpanded: false
                    },
                    {
                        id: 33,
                        title: 'Load Testing',
                        orderId: 1,
                        parentId: 14,
                        start: new Date('2014-06-30T00:00:00.000Z'),
                        end: new Date('2014-07-05T00:00:00.000Z'),
                        percentComplete: 0.1,
                        isExpanded: false
                    }
                ]
            },
            {
                id: 17,
                title: 'Release',
                orderId: 7,
                parentId: 7,
                start: new Date('2014-07-12T00:00:00.000Z'),
                end: new Date('2014-07-12T00:00:00.000Z'),
                percentComplete: 0,
                isExpanded: false
            },
            {
                id: 18,
                title: 'Project Kickoff',
                orderId: 0,
                parentId: 7,
                start: new Date('2014-06-02T00:00:00.000Z'),
                end: new Date('2014-06-02T00:00:00.000Z'),
                percentComplete: 0.23,
                isExpanded: false
            },
            {
                id: 30,
                title: 'Documentation',
                orderId: 5,
                parentId: 7,
                start: new Date('2014-06-23T00:00:00.000Z'),
                end: new Date('2014-07-05T00:00:00.000Z'),
                percentComplete: 0.14,
                isExpanded: false,
                children: [
                    {
                        id: 34,
                        title: 'Structure',
                        orderId: 0,
                        parentId: 30,
                        start: new Date('2014-06-23T00:00:00.000Z'),
                        end: new Date('2014-06-26T00:00:00.000Z'),
                        percentComplete: 0.28,
                        isExpanded: false
                    },
                    {
                        id: 35,
                        title: 'Articles',
                        orderId: 1,
                        parentId: 30,
                        start: new Date('2014-06-26T00:00:00.000Z'),
                        end: new Date('2014-07-05T00:00:00.000Z'),
                        percentComplete: 0,
                        isExpanded: false
                    }
                ]
            },
            {
                id: 31,
                title: 'Demos',
                orderId: 6,
                parentId: 7,
                start: new Date('2014-06-30T00:00:00.000Z'),
                end: new Date('2014-10-12T00:00:00.000Z'),
                percentComplete: 0.82,
                isExpanded: false,
                children: [
                    {
                        id: 36,
                        title: 'Structure',
                        orderId: 0,
                        parentId: 31,
                        start: new Date('2014-06-30T00:00:00.000Z'),
                        end: new Date('2014-10-02T00:00:00.000Z'),
                        percentComplete: 0.94,
                        isExpanded: false
                    },
                    {
                        id: 37,
                        title: 'Design',
                        orderId: 1,
                        parentId: 31,
                        start: new Date('2014-07-02T00:00:00.000Z'),
                        end: new Date('2014-10-05T00:00:00.000Z'),
                        percentComplete: 0.8,
                        isExpanded: false
                    },
                    {
                        id: 38,
                        title: 'Demos',
                        orderId: 2,
                        parentId: 31,
                        start: new Date('2014-07-03T00:00:00.000Z'),
                        end: new Date('2014-10-12T00:00:00.000Z'),
                        percentComplete: 0.72,
                        isExpanded: false
                    }
                ]
            }
        ]
    }
];

export const exampleDependencyData = [
    {
        id: 528,
        fromId: 18,
        toId: 19,
        type: 1
    },
    {
        id: 533,
        fromId: 22,
        toId: 23,
        type: 1
    },
    {
        id: 534,
        fromId: 23,
        toId: 24,
        type: 1
    },
    {
        id: 535,
        fromId: 24,
        toId: 26,
        type: 1
    },
    {
        id: 536,
        fromId: 26,
        toId: 27,
        type: 1
    },
    {
        id: 537,
        fromId: 26,
        toId: 28,
        type: 1
    },
    {
        id: 538,
        fromId: 27,
        toId: 29,
        type: 1
    },
    {
        id: 539,
        fromId: 28,
        toId: 29,
        type: 0
    },
    {
        id: 540,
        fromId: 29,
        toId: 32,
        type: 1
    },
    {
        id: 541,
        fromId: 29,
        toId: 33,
        type: 1
    },
    {
        id: 543,
        fromId: 29,
        toId: 36,
        type: 1
    },
    {
        id: 551,
        fromId: 13,
        toId: 29,
        type: 0
    },
    {
        id: 544,
        fromId: 34,
        toId: 35,
        type: 1
    },
    {
        id: 545,
        fromId: 32,
        toId: 33,
        type: 0
    },
    {
        id: 546,
        fromId: 33,
        toId: 17,
        type: 1
    },
    {
        id: 547,
        fromId: 35,
        toId: 17,
        type: 1
    },
    {
        id: 548,
        fromId: 38,
        toId: 17,
        type: 1
    },
    {
        id: 549,
        fromId: 36,
        toId: 37,
        type: 1
    },
    {
        id: 550,
        fromId: 37,
        toId: 38,
        type: 1
    },
    {
        id: 553,
        fromId: 18,
        toId: 20,
        type: 1
    },
    {
        id: 554,
        fromId: 20,
        toId: 39,
        type: 1
    },
    {
        id: 555,
        fromId: 19,
        toId: 39,
        type: 1
    },
    {
        id: 556,
        fromId: 39,
        toId: 22,
        type: 1
    },
    {
        id: 888,
        fromId: 29,
        toId: 28,
        type: 3
    },
    {
        id: 777,
        fromId: 7,
        toId: 11,
        type: 2
    }
];