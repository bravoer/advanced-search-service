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


// attendee/absentee count for repetition between 2 given dates
app.get('/statistics/attendances/events', function(req, res, next) {
    const from = req.query.from;
    const to = req.query.to || new Date().toISOString();
    const query = `
        PREFIX schema: <http://schema.org/>
        PREFIX bravoer: <http://mu.semte.ch/vocabularies/ext/bravoer/>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        SELECT ?e ?uuid ?startDate (COUNT(?attendee) as ?attendeeCount) (COUNT(?absentee) as ?absenteeCount)
        WHERE {
            ?e a schema:Event ;
               mu:uuid ?uuid ;
               schema:additionalType <http://mu.semte.ch/vocabularies/ext/bravoer/event-types/Rehearsal> ;
               schema:startDate ?startDate .

            FILTER(?startDate >= ${sparqlEscapeDate(from)})
            FILTER(?startDate <= ${sparqlEscapeDate(to)})

            { ?e bravoer:attendee ?attendee . } UNION { ?e bravoer:absentee ?absentee . }

        }
        GROUP BY ?e ?uuid ?startDate
        ORDER BY DESC(?startDate)
      `;

    sparql.query(query).then( function(response) {
        const statistics = response.results.bindings.map( function(binding) {
          return {
            event: binding.e.value,
            eventId: binding.uuid.value,
            startDate: binding.startDate.value,
            attendeeCount: binding.attendeeCount.value,
            absenteeCount: binding.absenteeCount.value
          };
        });
        res.json({ data: statistics });
    }).catch( function(err) {
        next(new Error(err));
    });

} );


// attendee/absentee count for musician between 2 given dates
app.get('/statistics/attendances/musicians', function(req, res, next) {
    const from = req.query.from;
    const to = req.query.to || new Date().toISOString();
    const query = `
        PREFIX schema: <http://schema.org/>
        PREFIX bravoer: <http://mu.semte.ch/vocabularies/ext/bravoer/>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>

        SELECT ?m ?uuid ?firstName ?lastName (COUNT(?attendEvent) as ?attendancesCount) (COUNT(?absentEvent) as ?absencesCount)
        WHERE {
            ?m a bravoer:Musician ;
               mu:uuid ?uuid ;
               vcard:hasGivenName ?firstName ;
               vcard:hasFamilyName ?lastName .

            { 
              ?attendEvent bravoer:attendee ?m ;
                a schema:Event ;
                schema:additionalType <http://mu.semte.ch/vocabularies/ext/bravoer/event-types/Rehearsal> ;
                schema:startDate ?startDate .
            }
            UNION
            { 
              ?absentEvent bravoer:absentee ?m ;
                a schema:Event ;
                schema:additionalType <http://mu.semte.ch/vocabularies/ext/bravoer/event-types/Rehearsal> ;
                schema:startDate ?startDate .
            }

            FILTER(?startDate >= ${sparqlEscapeDate(from)})
            FILTER(?startDate <= ${sparqlEscapeDate(to)})
        }
        GROUP BY ?m ?uuid ?firstName ?lastName
        ORDER BY DESC(?attendancesCount)
      `;

    sparql.query(query).then( function(response) {
        const statistics = response.results.bindings.map( function(binding) {
          return {
            musician: binding.m.value,
            musicianId: binding.uuid.value,
            name: `${binding.firstName.value} ${binding.lastName.value}`,
            attendancesCount: binding.attendancesCount.value,
            absencesCount: binding.absencesCount.value
          };
        });
        res.json({ data: statistics });
    }).catch( function(err) {
        next(new Error(err));
    });

} );
