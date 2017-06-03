import { app, sparql, sparqlEscapeDate } from 'mu';

// helpers since a given date
app.get('/helpers', function(req, res, next) {
    const since = req.query.since || new Date().toISOString();
    const query = `
        PREFIX schema: <http://schema.org/>
        PREFIX bravoer: <http://mu.semte.ch/vocabularies/ext/bravoer/>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        SELECT DISTINCT ?uuid
        WHERE {
            ?e a schema:Event ;
               schema:additionalType <http://mu.semte.ch/vocabularies/ext/bravoer/event-types/Concert> ;
               schema:startDate ?startDate .

            FILTER(?startDate >= ${sparqlEscapeDate(since)})

            ?e bravoer:helper ?s .
            ?s a bravoer:Sympathizer ;
               mu:uuid ?uuid .

        }`;

    sparql.query(query).then( function(response) {
        const uuids = response.results.bindings.map( function(binding) {
            return binding.uuid.value;
        });
        res.json({ data: { uuids: uuids } });
    }).catch( function(err) {
        next(new Error(err));
    });
} );  

