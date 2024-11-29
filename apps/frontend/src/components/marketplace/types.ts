interface SpecialMessageInterface {
    type: string;
    data: {
        id: string;
        [key: string]: any;
    };
}

export {
    SpecialMessageInterface
}