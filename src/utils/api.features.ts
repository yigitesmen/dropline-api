type SortOrder = 'asc' | 'desc';

interface FindManyArgs {
    where?: Record<string, unknown>;
    orderBy?: Record<string, SortOrder>[];
    select?: Record<string, boolean>;
    omit?: Record<string, boolean>;
    skip?: number;
    take?: number;
}

const OPERATOR_MAP: Record<string, string> = {
    gte: 'gte',
    gt: 'gt',
    lte: 'lte',
    lt: 'lt',
};

export class APIFeatures<T> {
    findMany: (args: FindManyArgs) => Promise<T[]>;
    queryString: Record<string, string>;
    neverSelect: string[];
    args: FindManyArgs;

    constructor(
        findMany: (args: FindManyArgs) => Promise<T[]>,
        queryString: Record<string, string>,
        neverSelect: string[] = [],
    ) {
        this.findMany = findMany;
        this.queryString = queryString;
        this.neverSelect = neverSelect;
        this.args = {};
    }

    search(fields: string[]) {
        const query = this.queryString.search;

        if (query) {
            this.args.where = {
                ...this.args.where,
                OR: fields.map(field => ({ [field]: { contains: query } })),
            };
        }

        return this;
    }

    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
        excludedFields.forEach(el => delete queryObj[el]);

        const where: Record<string, unknown> = {};

        for (const [field, value] of Object.entries(queryObj)) {
            if (value && typeof value === 'object') {
                const conditions: Record<string, unknown> = {};
                for (const [op, opValue] of Object.entries(value)) {
                    const prismaOp = OPERATOR_MAP[op];
                    if (prismaOp) {
                        const numeric = Number(opValue);
                        conditions[prismaOp] = Number.isNaN(numeric)
                            ? opValue
                            : numeric;
                    }
                }
                where[field] = conditions;
            } else {
                where[field] = value;
            }
        }

        this.args.where = { ...this.args.where, ...where };

        return this;
    }

    exclude(where: Record<string, unknown>) {
        this.args.where = { ...this.args.where, ...where };
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            this.args.select = this.queryString.fields
                .split(',')
                .filter(field => !this.neverSelect.includes(field))
                .reduce<Record<string, boolean>>((select, field) => {
                    select[field] = true;
                    return select;
                }, {});
        } else if (this.neverSelect.length) {
            this.args.omit = this.neverSelect.reduce<Record<string, boolean>>(
                (omit, field) => {
                    omit[field] = true;
                    return omit;
                },
                {},
            );
        }

        return this;
    }

    sort() {
        if (this.queryString.sort) {
            this.args.orderBy = this.queryString.sort
                .split(',')
                .map(field =>
                    field.startsWith('-')
                        ? { [field.slice(1)]: 'desc' as SortOrder }
                        : { [field]: 'asc' as SortOrder },
                );
        } else {
            this.args.orderBy = [{ createdAt: 'desc' }];
        }

        return this;
    }

    paginate() {
        const page = Number(this.queryString.page) || 1;
        const limit = Number(this.queryString.limit) || 100;
        const skip = (page - 1) * limit;

        this.args.skip = skip;
        this.args.take = limit;

        return this;
    }

    exec() {
        return this.findMany(this.args);
    }
}
