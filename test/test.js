import fetchMock from 'fetch-mock';
import jps from '../src/index.js';

fetchMock.config.overwriteRoutes = false;

// const emptyResultFixture = JSON.stringify(require('./httpResponseMocks/noResults.json'));
const resultsFixture = JSON.stringify(require('./httpResponseMocks/results.json'));

const queryString = '葛飾';
/*
const queryStringWithNoResults = 'dfasdfasfasdfa';
const queryStringForTimeout = 'cdafdsafasdfsadfsad';
const queryStringForError = 'cdfasdfasdfsfsa';
*/
const expectedResultLength = 5;

jest.useFakeTimers();

// setup server mocks
[
  { uriBuilderFn: 'getPersonLookupURI', testFixture: resultsFixture },
  { uriBuilderFn: 'getPlaceLookupURI', testFixture: resultsFixture },
  { uriBuilderFn: 'getOrganizationLookupURI', testFixture: resultsFixture },
  { uriBuilderFn: 'getTitleLookupURI', testFixture: resultsFixture },
  { uriBuilderFn: 'getRSLookupURI', testFixture: resultsFixture },
].forEach((entityLookup) => {
  const uriBuilderFn = jps[entityLookup.uriBuilderFn];

  fetchMock.get(uriBuilderFn(queryString), entityLookup.testFixture);
  /*
  fetchMock.get(uriBuilderFn(queryStringWithNoResults), emptyResultFixture);
  fetchMock.get(uriBuilderFn(queryStringForTimeout), () => {
    setTimeout(Promise.resolve, 8100);
  });
  fetchMock.get(uriBuilderFn(queryStringForError), 500);
  */
});

// from https://stackoverflow.com/a/35047888
const doObjectsHaveSameKeys = (...objects) => {
  const allKeys = objects.reduce((keys, object) => keys.concat(Object.keys(object)), []);
  const union = new Set(allKeys);
  return objects.every((object) => union.size === Object.keys(object).length);
};

test('lookup builders', () => {
  // expect.assertions(5);
  expect.assertions(1);
  [
    // 'getPersonLookupURI',
    'getPlaceLookupURI',
    //'getTitleLookupURI',
    //'getOrganizationLookupURI',
    //'getRSLookupURI',
  ].forEach((uriBuilderMethod) => {
    const encodedQueryString = encodeURIComponent(queryString);
    expect(jps[uriBuilderMethod](queryString).includes(encodedQueryString)).toBe(true);
  });
});

[/*'findPerson', 'findPlace', 'findOrganization', 'findTitle', 'findRS'*/ "findPlace"].forEach((nameOfLookupFn) => {
  test(nameOfLookupFn, async () => {
    expect.assertions(12);

    const results = await jps[nameOfLookupFn](queryString);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(expectedResultLength);

    results.forEach((singleResult) => {
      expect(
        doObjectsHaveSameKeys(singleResult, {
          nameType: '',
          id: '',
          uri: '',
          uriForDisplay: '',
          name: '',
          repository: '',
          originalQueryString: '',
          description: '',
        })
      ).toBe(true);
      expect(singleResult.originalQueryString).toBe(queryString);
    });
  });

  /*
  test(`${nameOfLookupFn} - no results`, async () => {
    // with no results
    expect.assertions(2);

    const results = await jps[nameOfLookupFn](queryStringWithNoResults);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  test(`${nameOfLookupFn} - server error`, async () => {
    // with a server error
    expect.assertions(2);

    let shouldBeNullResult = false;
    shouldBeNullResult = await jps[nameOfLookupFn](queryStringForError).catch(() => {
      // an http error should reject the promise
      expect(true).toBe(true);
      return false;
    });
    // a falsey result should be returned
    expect(shouldBeNullResult).toBeFalsy();
  });

  test(`${nameOfLookupFn} - times out`, async () => {
    // when query times out
    expect.assertions(1);
    await jps[nameOfLookupFn](queryStringForTimeout).catch(() => {
      expect(true).toBe(true);
    });
  });
  */
});
