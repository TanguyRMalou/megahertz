import 'reflect-metadata';
import {container} from 'tsyringe';
import {v4} from 'uuid';
import {advanceTo} from 'jest-date-mock';
import DateParser from '../../../../utils/dateParser';
import useTestingUtilities from '../../../../configuration/containers/utils';
import TypeORMCarRentalReadRepository from '../../../../../src/driven/repositories/typeorm/carRental/read';
import CarRentalDTO from '../../../../../src/core/domain/carRental/dto';
import useTypeORMRepositories from '../../../../../src/configuration/injection/containers/repositories/typeorm';
import AppDataSource from '../../../../../src/configuration/database/typeorm/data-source';
import TypeORMCarRentalFactory from '../../seeding/factories/carRental';
import TypeORMCustomerFactory from '../../seeding/factories/customer';
import TypeORMCarFactory from '../../seeding/factories/car';
import TypeORMCarModelFactory from '../../seeding/factories/carModel';

describe.each([
    {
        rental: {
            id: v4(),
            customerId: v4(),
            car: {
                id: v4(),
                model: {
                    id: '28837cd2-512c-4212-b934-c10d36ddfd7f',
                    dailyRate: 100,
                }
            },
            totalPrice: 100,
            pickupDateTime: 'today',
            dropOffDateTime: 'tomorrow',
        }
    },
    {
        rental: {
            id: v4(),
            customerId: v4(),
            car: {
                id: v4(),
                model: {
                    id: v4(),
                    dailyRate: 200,
                }
            },
            totalPrice: 200,
            pickupDateTime: 'tomorrow',
            dropOffDateTime: 'in 2 days',
        }
    },
])("Integration tests to read car rentals from a postgres database using typeorm", (testCase) => {
    let repository: TypeORMCarRentalReadRepository;
    let expectedCarRental: Partial<CarRentalDTO>;
    let dateParser: DateParser;

    beforeAll(async () => {
        advanceTo(Date.now());
        useTestingUtilities();
        dateParser = container.resolve("DateParser");
        useTypeORMRepositories();
        repository = container.resolve("CarRentalReadRepositoryInterface");
    })

    beforeEach(async () => {
        await AppDataSource.initialize();
        await AppDataSource.synchronize();
        const customer = await new TypeORMCustomerFactory().create({
            id: testCase.rental.customerId,
        });
        const model = await new TypeORMCarModelFactory().create({
            id: testCase.rental.car.model.id,
            dailyRate: testCase.rental.car.model.dailyRate,
        });
        const car = await new TypeORMCarFactory().create({
            id: testCase.rental.car.id,
            model
        });
        await new TypeORMCarRentalFactory().create({
            id: testCase.rental.id,
            totalPrice: testCase.rental.totalPrice,
            pickupDateTime: dateParser.parse(testCase.rental.pickupDateTime),
            dropOffDateTime: dateParser.parse(testCase.rental.dropOffDateTime),
            customer,
            car,
        });
        expectedCarRental = {
            id: testCase.rental.id,
            customerId: testCase.rental.customerId,
            car: {
                id: testCase.rental.car.id,
                model: {
                    id: testCase.rental.car.model.id,
                    dailyRate: testCase.rental.car.model.dailyRate,
                },
            },
            pickupDateTime: dateParser.parse(testCase.rental.pickupDateTime),
            dropOffDateTime: dateParser.parse(testCase.rental.dropOffDateTime),
            totalPrice: testCase.rental.totalPrice,
        }
    })

    afterEach(async () => {
        await AppDataSource.dropDatabase();
        await AppDataSource.destroy();
    })

    test(`Read a car rental ${testCase.rental.id} should return one car rental`, async () => {
        const retrievedCarRental = await repository.read(testCase.rental.id);
        expect(retrievedCarRental.toDTO()).toEqual(expectedCarRental);
    })
})