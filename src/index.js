const findPerson = (queryString) => callJps(getPersonLookupURI(queryString), queryString, "Person");
const findPlace = (queryString) => callJps(getPlaceLookupURI(queryString), queryString, "Place");
const findOrganization = (queryString) => callJps(getOrganizationLookupURI(queryString), queryString, "Organization");
const findTitle = (queryString) => callJps(getTitleLookupURI(queryString), queryString, "Title");
const findRS = (queryString) => callJps(getRSLookupURI(queryString), queryString, "RS");

const getPersonLookupURI = (queryString) => getEntitySourceURI(queryString, "type:Person");
const getPlaceLookupURI = (queryString) => getEntitySourceURI(queryString, "type:Place");
const getOrganizationLookupURI = (queryString) => getEntitySourceURI(queryString, "type:Agent");
const getTitleLookupURI = (queryString) => getEntitySourceURI(queryString, "title");
const getRSLookupURI = (queryString) => getEntitySourceURI(queryString, null);

// note that this method is exposed on the npm module to simplify testing,
// i.e., to allow intercepting the HTTP call during testing, using sinon or similar.
const getEntitySourceURI = (queryString, type) => {
  // the wdk used below, actually uses the jps php api

  const LIMIT = 200;

  let sparqlQuery = ""

  if (type === "title") {

    sparqlQuery = `
    SELECT DISTINCT ?s ?label ?description WHERE {
      ?s jps:sourceInfo ?source .
      ?s rdfs:label ?label .
      optional { ?s schema:description ?description . }
      FILTER(bif:contains(?label, '"${queryString}"')) .
    }
    LIMIT ${LIMIT}
  `;

  } else {

    sparqlQuery = `
    SELECT DISTINCT ?s ?label ?description WHERE {
      ?s a ${type} .
      ?s rdfs:label ?label .
      optional { ?s schema:description ?description . }
      ?s ?p ?value.
      FILTER(bif:contains(?value, '"${queryString}"')) .
    }
    LIMIT ${LIMIT}
  `;
  }

  const query = encodeURIComponent(sparqlQuery);

  return `https://jpsearch.go.jp/rdf/sparql/?output=json&query=${query}`
};

const callJps = async (url, queryString, nameType) => {
  const response = await fetchWithTimeout(url).catch((error) => {
    return error;
  });

  //if status not ok, through an error
  if (!response.ok)
    throw new Error(
      `Something wrong with the call to Jps, possibly a problem with the network or the server. HTTP error: ${response.status}`
    );

  const responseJson = await response.json();

  const results = responseJson.results.bindings.map(({ s, label: name, description }) => {
    const uri = s.value
    return {
      nameType,
      id: uri,
      uriForDisplay: uri,
      uri,
      name: name.value,
      repository: 'jps',
      originalQueryString: queryString,
      description: description ? description.value : ''
    };
  });



  return results;
};

/*
     config is passed through to fetch, so could include things like:
     {
         method: 'get',
         credentials: 'same-origin'
    }
*/
const fetchWithTimeout = (url, config = {}, time = 30000) => {
  /*
        the reject on the promise in the timeout callback won't have any effect, *unless*
        the timeout is triggered before the fetch resolves, in which case the setTimeout rejects
        the whole outer Promise, and the promise from the fetch is dropped entirely.
    */

  // Create a promise that rejects in <time> milliseconds
  const timeout = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject('Call to Jps timed out');
    }, time);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([fetch(url, config), timeout]);
};

export default {
  findPerson,
  findPlace,
  findOrganization,
  findTitle,
  findRS,
  getPersonLookupURI,
  getPlaceLookupURI,
  getOrganizationLookupURI,
  getTitleLookupURI,
  getRSLookupURI,
  fetchWithTimeout,
};
